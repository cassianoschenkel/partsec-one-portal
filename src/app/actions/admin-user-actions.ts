"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

async function requirePartsecAdmin() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Usuário não autenticado.");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive || user.role !== UserRole.PARTSEC_ADMIN) {
    throw new Error("Acesso restrito a administradores globais.");
  }

  return user;
}

export async function createGlobalAdminUserAction(formData: FormData) {
  await requirePartsecAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (!name) {
    throw new Error("Nome é obrigatório.");
  }

  if (!email) {
    throw new Error("E-mail é obrigatório.");
  }

  if (!password) {
    throw new Error("Senha temporária é obrigatória.");
  }

  if (password.length < 10) {
    throw new Error("A senha deve ter pelo menos 10 caracteres.");
  }

  if (password !== confirmPassword) {
    throw new Error("A confirmação de senha não confere.");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new Error("Já existe um usuário com este e-mail.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: UserRole.PARTSEC_ADMIN,
      tenantId: null,
      isActive: true,
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function toggleGlobalAdminUserStatusAction(userId: string) {
  const currentUser = await requirePartsecAdmin();

  if (currentUser.id === userId) {
    throw new Error("Você não pode desativar o seu próprio usuário.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || user.role !== UserRole.PARTSEC_ADMIN) {
    throw new Error("Usuário administrador global não encontrado.");
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isActive: !user.isActive,
    },
  });

  revalidatePath("/admin/users");
}

export async function resetGlobalAdminUserPasswordAction(
  userId: string,
  formData: FormData
) {
  await requirePartsecAdmin();

  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (!password) {
    throw new Error("Nova senha é obrigatória.");
  }

  if (password.length < 10) {
    throw new Error("A senha deve ter pelo menos 10 caracteres.");
  }

  if (password !== confirmPassword) {
    throw new Error("A confirmação de senha não confere.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user || user.role !== UserRole.PARTSEC_ADMIN) {
    throw new Error("Usuário administrador global não encontrado.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordHash,
      isActive: true,
    },
  });

  revalidatePath("/admin/users");
}
