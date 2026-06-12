"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

function redirectWithCreateUserError({
  message,
  name,
  email,
}: {
  message: string;
  name?: string;
  email?: string;
}) {
  const params = new URLSearchParams();

  params.set("error", message);

  if (name) {
    params.set("name", name);
  }

  if (email) {
    params.set("email", email);
  }

  redirect(`/admin/users/new?${params.toString()}`);
}

function redirectWithTenantUserEditError({
  tenantSlug,
  userId,
  message,
  name,
  email,
  role,
}: {
  tenantSlug: string;
  userId: string;
  message: string;
  name?: string;
  email?: string;
  role?: string;
}) {
  const params = new URLSearchParams();

  params.set("error", message);

  if (name) {
    params.set("name", name);
  }

  if (email) {
    params.set("email", email);
  }

  if (role) {
    params.set("role", role);
  }

  redirect(
    `/admin/tenants/${tenantSlug}/users/${userId}/edit?${params.toString()}`
  );
}

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
  redirectWithCreateUserError({
    message: "Nome é obrigatório.",
    name,
    email,
  });
}

if (!email) {
  redirectWithCreateUserError({
    message: "E-mail é obrigatório.",
    name,
    email,
  });
}

if (!password) {
  redirectWithCreateUserError({
    message: "Senha temporária é obrigatória.",
    name,
    email,
  });
}

if (password.length < 10) {
  redirectWithCreateUserError({
    message: "A senha deve ter pelo menos 10 caracteres.",
    name,
    email,
  });
}

if (password !== confirmPassword) {
  redirectWithCreateUserError({
    message: "A confirmação de senha não confere.",
    name,
    email,
  });
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
  redirectWithCreateUserError({
    message: "Este e-mail já está em uso por outro usuário.",
    name,
    email,
  });
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

export async function updateTenantUserAction({
  tenantSlug,
  userId,
}: {
  tenantSlug: string;
  userId: string;
}, formData: FormData) {
  await requirePartsecAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim();

if (!name) {
  redirectWithTenantUserEditError({
    tenantSlug,
    userId,
    message: "Nome é obrigatório.",
    name,
    email,
    role,
  });
}

if (!email) {
  redirectWithTenantUserEditError({
    tenantSlug,
    userId,
    message: "E-mail é obrigatório.",
    name,
    email,
    role,
  });
}

if (!["ADMIN_TENANT", "VIEWER_TENANT"].includes(role)) {
  redirectWithTenantUserEditError({
    tenantSlug,
    userId,
    message: "Perfil inválido para usuário de tenant.",
    name,
    email,
    role,
  });
}

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Usuário do tenant não encontrado.");
  }

  if (user.role === UserRole.PARTSEC_ADMIN) {
    throw new Error("Esta ação não edita administradores globais.");
  }

  const existingUserWithEmail = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
  redirectWithTenantUserEditError({
    tenantSlug,
    userId,
    message: "Este e-mail já está em uso por outro usuário.",
    name,
    email,
    role,
  });
}

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name,
      email,
      role: role as UserRole,
    },
  });

  revalidatePath(`/admin/tenants/${tenant.slug}`);
  revalidatePath(`/admin/tenants/${tenant.slug}/users/${userId}/edit`);
  redirect(`/admin/tenants/${tenant.slug}`);
}

export async function toggleTenantUserStatusAction({
  tenantSlug,
  userId,
}: {
  tenantSlug: string;
  userId: string;
}) {
  await requirePartsecAdmin();

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new Error("Usuário do tenant não encontrado.");
  }

  if (user.role === UserRole.PARTSEC_ADMIN) {
    throw new Error("Esta ação não altera administradores globais.");
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isActive: !user.isActive,
    },
  });

  revalidatePath(`/admin/tenants/${tenant.slug}`);
  revalidatePath(`/admin/tenants/${tenant.slug}/users/${userId}/edit`);
}

export async function resetTenantUserPasswordAction({
  tenantSlug,
  userId,
}: {
  tenantSlug: string;
  userId: string;
}, formData: FormData) {
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

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Usuário do tenant não encontrado.");
  }

  if (user.role === UserRole.PARTSEC_ADMIN) {
    throw new Error("Esta ação não redefine senha de administradores globais.");
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

  revalidatePath(`/admin/tenants/${tenant.slug}`);
  revalidatePath(`/admin/tenants/${tenant.slug}/users/${userId}/edit`);
}
export async function deleteGlobalAdminUserAction(userId: string) {
  const currentUser = await requirePartsecAdmin();

  if (currentUser.id === userId) {
    throw new Error("Você não pode excluir o seu próprio usuário.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      email: true,
    },
  });

  if (!user || user.role !== UserRole.PARTSEC_ADMIN) {
    throw new Error("Usuário administrador global não encontrado.");
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  revalidatePath("/admin/users");
}

export async function deleteTenantUserAction({
  tenantSlug,
  userId,
}: {
  tenantSlug: string;
  userId: string;
}) {
  await requirePartsecAdmin();

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado.");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Usuário do tenant não encontrado.");
  }

  if (user.role === UserRole.PARTSEC_ADMIN) {
    throw new Error("Esta ação não exclui administradores globais.");
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  revalidatePath(`/admin/tenants/${tenant.slug}`);
  redirect(`/admin/tenants/${tenant.slug}`);
}
