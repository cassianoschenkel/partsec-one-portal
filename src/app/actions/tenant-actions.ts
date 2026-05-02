"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSlug } from "@/lib/slug";
import { IntegrationStatus, IntegrationType } from "@/generated/prisma/client";

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
