"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSlug } from "@/lib/slug";
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

  const allowedRoles = [
    UserRole.TENANT_ADMIN,
    UserRole.TENANT_USER,
    UserRole.READ_ONLY,
  ];

  if (!allowedRoles.includes(roleInput as UserRole)) {
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

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name,
      email,
      role: roleInput as UserRole,
      passwordHash: null,
      isActive: true,
    },
  });

  redirect(`/admin/tenants/${tenant.slug}`);
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

  const allowedAssetTypes = [
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

  if (!allowedAssetTypes.includes(assetTypeInput as AssetType)) {
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
