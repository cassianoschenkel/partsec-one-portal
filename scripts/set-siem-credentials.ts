import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { encryptSecret } from "../src/lib/crypto";

async function upsertCredential({
  integrationConfigId,
  key,
  value,
}: {
  integrationConfigId: string;
  key: string;
  value: string;
}) {
  await prisma.integrationCredential.upsert({
    where: {
      integrationConfigId_key: {
        integrationConfigId,
        key,
      },
    },
    update: {
      encryptedValue: encryptSecret(value),
    },
    create: {
      integrationConfigId,
      key,
      encryptedValue: encryptSecret(value),
    },
  });
}

async function main() {
  const integrationConfigId = process.env.SIEM_INTEGRATION_ID;
  const username = process.env.SIEM_API_USERNAME;
  const password = process.env.SIEM_API_PASSWORD;

  if (!integrationConfigId || !username || !password) {
    throw new Error(
      "Defina SIEM_INTEGRATION_ID, SIEM_API_USERNAME e SIEM_API_PASSWORD."
    );
  }

  await upsertCredential({
    integrationConfigId,
    key: "api_username",
    value: username,
  });

  await upsertCredential({
    integrationConfigId,
    key: "api_password",
    value: password,
  });

  console.log("Credenciais SIEM salvas com sucesso.");
}

main()
  .catch((error) => {
    console.error("Erro ao salvar credenciais SIEM:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
