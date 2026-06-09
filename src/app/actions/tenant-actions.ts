"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { createSlug } from "@/lib/slug";
import { getZabbixClientForTenant } from "@/lib/integrations/zabbix-client";
import { createPasswordSetupToken } from "@/lib/password-setup-token";
import { buildPasswordSetupEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/mailer";
import {
  AssetType,
  IntegrationStatus,
  IntegrationType,
  UserRole,
} from "@/generated/prisma/client";

export async function createTenantAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!name) {
    throw new Error("Nome do tenant é obrigatório.");
  }

  const slug = slugInput ? createSlug(slugInput) : createSlug(name);

  if (!slug) {
    throw new Error("Slug inválido.");
  }

  const existingTenant = await prisma.tenant.findUnique({
    where: {
      slug,
    },
  });

  if (existingTenant) {
    throw new Error("Já existe um tenant com este slug.");
  }

  await prisma.tenant.create({
    data: {
      name,
      slug,
      document: document || null,
      isActive: true,
      integrations: {
        create: [
          {
            type: IntegrationType.ZABBIX,
            status: IntegrationStatus.INACTIVE,
            displayName: `Zabbix - ${name}`,
            notes: "Integração criada automaticamente no cadastro do tenant.",
          },
          {
            type: IntegrationType.WAZUH,
            status: IntegrationStatus.INACTIVE,
            displayName: `Wazuh - ${name}`,
            externalGroupId: slug,
            notes: "Integração criada automaticamente no cadastro do tenant.",
          },
          {
            type: IntegrationType.ZAMMAD,
            status: IntegrationStatus.INACTIVE,
            displayName: `Zammad - ${name}`,
            notes: "Integração criada automaticamente no cadastro do tenant.",
          },
        ],
      },
    },
  });

  redirect(`/admin/tenants/${slug}`);
}

export async function createTenantUserAction(
  tenantSlug: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleInput = String(formData.get("role") ?? "").trim();

  if (!name) {
    throw new Error("Nome do usuário é obrigatório.");
  }

  if (!email) {
    throw new Error("E-mail do usuário é obrigatório.");
  }

  const allowedRoles: string[] = [
    UserRole.TENANT_ADMIN,
    UserRole.TENANT_USER,
    UserRole.READ_ONLY,
  ];

  if (!allowedRoles.includes(roleInput)) {
    throw new Error("Perfil de usuário inválido.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("Já existe um usuário com este e-mail.");
  }

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name,
      email,
      role: roleInput as UserRole,
      passwordHash: null,
      isActive: true,
    },
  });

  const { rawToken } = await createPasswordSetupToken(user.id);

  const appUrl = process.env.APP_URL?.replace(/\/+$/, "") ?? "";
  const setupUrl = `${appUrl}/set-password?token=${rawToken}`;

  const emailContent = buildPasswordSetupEmail({
    userName: user.name,
    tenantName: tenant.name,
    setupUrl,
  });

  let inviteSent = "true";

  try {
    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (error) {
    inviteSent = "false";
    console.error("Falha ao enviar convite de acesso:", error);
  }

  redirect(
    `/admin/tenants/${tenant.slug}?createdUserEmail=${encodeURIComponent(
      user.email
    )}&setupToken=${rawToken}&inviteSent=${inviteSent}`
  );
}

export async function createTenantAssetAction(
  tenantSlug: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  const hostname = String(formData.get("hostname") ?? "").trim();
  const ipAddress = String(formData.get("ipAddress") ?? "").trim();
  const assetTypeInput = String(formData.get("assetType") ?? "").trim();
  const operatingSystem = String(formData.get("operatingSystem") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const zabbixHostId = String(formData.get("zabbixHostId") ?? "").trim();
  const wazuhAgentId = String(formData.get("wazuhAgentId") ?? "").trim();

  if (!name) {
    throw new Error("Nome do ativo é obrigatório.");
  }

  const allowedAssetTypes: string[] = [
    AssetType.SERVER,
    AssetType.WORKSTATION,
    AssetType.FIREWALL,
    AssetType.SWITCH,
    AssetType.ROUTER,
    AssetType.ACCESS_POINT,
    AssetType.LINK,
    AssetType.SERVICE,
    AssetType.OTHER,
  ];

  if (!allowedAssetTypes.includes(assetTypeInput)) {
    throw new Error("Tipo de ativo inválido.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  await prisma.customerAsset.create({
    data: {
      tenantId: tenant.id,
      name,
      hostname: hostname || null,
      ipAddress: ipAddress || null,
      assetType: assetTypeInput as AssetType,
      operatingSystem: operatingSystem || null,
      description: description || null,
      zabbixHostId: zabbixHostId || null,
      wazuhAgentId: wazuhAgentId || null,
      isActive: true,
    },
  });

  redirect(`/admin/tenants/${tenant.slug}`);
}

export async function updateTenantIntegrationAction(
  tenantSlug: string,
  integrationType: IntegrationType,
  formData: FormData
) {
  const statusInput = String(formData.get("status") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const externalGroupId = String(formData.get("externalGroupId") ?? "").trim();
  const externalOrgId = String(formData.get("externalOrgId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const allowedStatuses: string[] = [
    IntegrationStatus.ACTIVE,
    IntegrationStatus.INACTIVE,
    IntegrationStatus.ERROR,
  ];

  if (!allowedStatuses.includes(statusInput)) {
    throw new Error("Status de integração inválido.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  await prisma.integrationConfig.update({
    where: {
      tenantId_type: {
        tenantId: tenant.id,
        type: integrationType,
      },
    },
    data: {
      status: statusInput as IntegrationStatus,
      baseUrl: baseUrl || null,
      externalGroupId: externalGroupId || null,
      externalOrgId: externalOrgId || null,
      notes: notes || null,
    },
  });

  redirect(`/admin/tenants/${tenant.slug}/integrations`);
}

async function upsertIntegrationCredential({
  integrationConfigId,
  key,
  value,
}: {
  integrationConfigId: string;
  key: string;
  value: string;
}) {
  const encryptedValue = encryptSecret(value);

  await prisma.integrationCredential.upsert({
    where: {
      integrationConfigId_key: {
        integrationConfigId,
        key,
      },
    },
    update: {
      encryptedValue,
    },
    create: {
      integrationConfigId,
      key,
      encryptedValue,
    },
  });
}

export async function updateTenantIntegrationCredentialAction(
  tenantSlug: string,
  integrationType: IntegrationType,
  formData: FormData
) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const integration = await prisma.integrationConfig.findUnique({
    where: {
      tenantId_type: {
        tenantId: tenant.id,
        type: integrationType,
      },
    },
  });

  if (!integration) {
    throw new Error("Integração não encontrada.");
  }

  if (integrationType === IntegrationType.WAZUH) {
    const apiUsername = String(formData.get("apiUsername") ?? "").trim();
    const apiPassword = String(formData.get("apiPassword") ?? "").trim();
    const indexerUsername = String(formData.get("indexerUsername") ?? "").trim();
    const indexerPassword = String(formData.get("indexerPassword") ?? "").trim();

    if (!apiUsername && !apiPassword && !indexerUsername && !indexerPassword) {
      throw new Error(
        "Informe usuário e/ou senha da API para atualizar as credenciais SIEM."
      );
    }

    if (apiUsername) {
      await upsertIntegrationCredential({
        integrationConfigId: integration.id,
        key: "api_username",
        value: apiUsername,
      });
    }

    if (apiPassword) {
      await upsertIntegrationCredential({
        integrationConfigId: integration.id,
        key: "api_password",
        value: apiPassword,
      });
    }

    if (indexerUsername) {
	  await upsertIntegrationCredential({
		integrationConfigId: integration.id,
		key: "indexer_username",
		value: indexerUsername,
  });
}

	if (indexerPassword) {
	  await upsertIntegrationCredential({
		integrationConfigId: integration.id,
		key: "indexer_password",
		value: indexerPassword,
  });
}

    redirect(`/admin/tenants/${tenant.slug}/integrations`);
  }

  const apiToken = String(formData.get("apiToken") ?? "").trim();

  if (!apiToken) {
    throw new Error("API token é obrigatório.");
  }

  await upsertIntegrationCredential({
    integrationConfigId: integration.id,
    key: "api_token",
    value: apiToken,
  });

  redirect(`/admin/tenants/${tenant.slug}/integrations`);
}

export async function testZabbixIntegrationAction(tenantSlug: string) {
  const { client } = await getZabbixClientForTenant(tenantSlug);

  const version = await client.getVersion();

  console.log(`Zabbix conectado para tenant ${tenantSlug}. Versão: ${version}`);

  redirect(`/admin/tenants/${tenantSlug}/integrations`);
}

export async function updateTenantAssetAction(
  tenantSlug: string,
  assetId: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  const hostname = String(formData.get("hostname") ?? "").trim();
  const ipAddress = String(formData.get("ipAddress") ?? "").trim();
  const assetTypeInput = String(formData.get("assetType") ?? "").trim();
  const operatingSystem = String(formData.get("operatingSystem") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const zabbixHostId = String(formData.get("zabbixHostId") ?? "").trim();
  const wazuhAgentId = String(formData.get("wazuhAgentId") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!name) {
    throw new Error("Nome do ativo é obrigatório.");
  }

  const allowedAssetTypes: string[] = [
    AssetType.SERVER,
    AssetType.WORKSTATION,
    AssetType.FIREWALL,
    AssetType.SWITCH,
    AssetType.ROUTER,
    AssetType.ACCESS_POINT,
    AssetType.LINK,
    AssetType.SERVICE,
    AssetType.OTHER,
  ];

  if (!allowedAssetTypes.includes(assetTypeInput)) {
    throw new Error("Tipo de ativo inválido.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const asset = await prisma.customerAsset.findFirst({
    where: {
      id: assetId,
      tenantId: tenant.id,
    },
  });

  if (!asset) {
    throw new Error("Ativo não encontrado.");
  }

  await prisma.customerAsset.update({
    where: {
      id: asset.id,
    },
    data: {
      name,
      hostname: hostname || null,
      ipAddress: ipAddress || null,
      assetType: assetTypeInput as AssetType,
      operatingSystem: operatingSystem || null,
      description: description || null,
      zabbixHostId: zabbixHostId || null,
      wazuhAgentId: wazuhAgentId || null,
      isActive,
    },
  });

  redirect(`/admin/tenants/${tenant.slug}`);
}

export async function linkSiemAgentToAssetAction({
  tenantSlug,
  assetId,
  wazuhAgentId,
}: {
  tenantSlug: string;
  assetId: string;
  wazuhAgentId: string;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "PARTSEC_ADMIN") {
    throw new Error("Acesso não autorizado.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const agent = await prisma.siemAgentSnapshot.findUnique({
    where: {
      tenantId_wazuhAgentId: {
        tenantId: tenant.id,
        wazuhAgentId,
      },
    },
  });

  if (!agent) {
    throw new Error("Agente SIEM não encontrado para este tenant.");
  }

  const asset = await prisma.customerAsset.findFirst({
    where: {
      id: assetId,
      tenantId: tenant.id,
      isActive: true,
    },
  });

  if (!asset) {
    throw new Error("Ativo não encontrado para este tenant.");
  }

  await prisma.customerAsset.update({
    where: {
      id: asset.id,
    },
    data: {
      wazuhAgentId: agent.wazuhAgentId,
    },
  });

  revalidatePath(`/admin/tenants/${tenantSlug}/siem`);
  revalidatePath(`/admin/tenants/${tenantSlug}`);
  revalidatePath("/assets");
}
