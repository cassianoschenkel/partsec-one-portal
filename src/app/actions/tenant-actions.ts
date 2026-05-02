"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSlug } from "@/lib/slug";
import {
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
