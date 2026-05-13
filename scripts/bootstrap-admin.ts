import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  const name = process.argv[4] ?? "Administrador Partsec";

  if (!email || !password) {
    console.error("Uso:");
    console.error(
      "npx tsx scripts/bootstrap-admin.ts admin@partsec.com.br 'Senha@123456' 'Administrador Partsec'"
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      name,
      passwordHash,
      role: UserRole.PARTSEC_ADMIN,
      tenantId: null,
      isActive: true,
    },
    create: {
      name,
      email,
      passwordHash,
      role: UserRole.PARTSEC_ADMIN,
      tenantId: null,
      isActive: true,
    },
  });

  console.log("Admin global pronto.");
  console.log(`Nome: ${user.name}`);
  console.log(`E-mail: ${user.email}`);
  console.log(`Perfil: ${user.role}`);
}

main()
  .catch((error) => {
    console.error("Erro no bootstrap do admin:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
