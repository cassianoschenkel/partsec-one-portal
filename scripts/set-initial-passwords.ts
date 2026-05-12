import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const password = "Partsec@123456";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: {
      email: "admin@partsec.local",
    },
    data: {
      passwordHash,
      isActive: true,
    },
  });

  await prisma.user.update({
    where: {
      email: "admin.demo@partsec.local",
    },
    data: {
      passwordHash,
      isActive: true,
    },
  });

  console.log("Senhas iniciais configuradas.");
  console.log("Senha temporária:", password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
