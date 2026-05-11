import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { IntegrationType } from "@/generated/prisma/client";

export async function getIntegrationCredential({
  tenantSlug,
  type,
  key,
}: {
  tenantSlug: string;
  type: IntegrationType;
  key: string;
}) {
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
        type,
      },
    },
    include: {
      credentials: true,
    },
  });

  if (!integration) {
    throw new Error("Integração não encontrada.");
  }

  const credential = integration.credentials.find(
    (item) => item.key === key
  );

  if (!credential) {
    throw new Error(`Credencial '${key}' não encontrada.`);
  }

  return {
    tenant,
    integration,
    value: decryptSecret(credential.encryptedValue),
  };
}
