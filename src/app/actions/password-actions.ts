"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPasswordSetupTokenHash } from "@/lib/password-setup-token";
import { isSetupTokenUsable } from "@/lib/setup-token-rules";

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
  });

  if (!setupToken || !isSetupTokenUsable(setupToken)) {
    redirect("/set-password?error=invalid_token");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordSetupToken.updateMany({
      where: {
        id: setupToken.id,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (consumed.count !== 1) {
      return { ok: false as const };
    }

    await tx.user.update({
      where: {
        id: setupToken.userId,
      },
      data: {
        passwordHash,
        isActive: true,
      },
    });

    return { ok: true as const };
  });

  if (!result.ok) {
    redirect("/set-password?error=invalid_token");
  }

  redirect("/login?passwordSet=success");
}
