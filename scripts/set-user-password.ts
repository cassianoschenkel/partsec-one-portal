import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Uso:");
    console.error("npx tsx scripts/set-user-password.ts usuario@empresa.com.br 'Senha@123'");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      tenant: true,
    },
  });

  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: {
      email,
    },
    data: {
      passwordHash,
      isActive: true,
    },
  });

  console.log("Senha atualizada com sucesso.");
  console.log(`Usuário: ${user.name}`);
  console.log(`E-mail: ${user.email}`);
  console.log(`Perfil: ${user.role}`);
  console.log(`Tenant: ${user.tenant?.name ?? "Sem tenant / Admin global"}`);
}

main()
  .catch((error) => {
    console.error("Erro ao atualizar senha:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
