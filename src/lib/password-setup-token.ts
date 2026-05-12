import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_EXPIRATION_HOURS = 24;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRawPasswordSetupToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getPasswordSetupTokenHash(token: string) {
  return hashToken(token);
}

export async function createPasswordSetupToken(userId: string) {
  const rawToken = createRawPasswordSetupToken();
  const tokenHash = getPasswordSetupTokenHash(rawToken);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS);

  await prisma.passwordSetupToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    rawToken,
    expiresAt,
  };
}
