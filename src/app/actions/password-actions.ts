"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPasswordSetupTokenHash } from "@/lib/password-setup-token";

export async function setPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? ""
  );

  if (!token) {
    redirect("/set-password?error=invalid_token");
  }

  if (password.length < 8) {
    redirect(`/set-password?token=${token}&error=password_too_short`);
  }

  if (password !== passwordConfirmation) {
    redirect(`/set-password?token=${token}&error=password_mismatch`);
  }

  const tokenHash = getPasswordSetupTokenHash(token);

  const setupToken = await prisma.passwordSetupToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!setupToken || setupToken.usedAt || setupToken.expiresAt < new Date()) {
    redirect("/set-password?error=invalid_token");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: setupToken.userId,
      },
      data: {
        passwordHash,
        isActive: true,
      },
    }),
    prisma.passwordSetupToken.update({
      where: {
        id: setupToken.id,
      },
      data: {
        usedAt: new Date(),
      },
    }),
  ]);

  redirect("/login?passwordSet=success");
}
