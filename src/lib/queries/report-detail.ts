import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";

export type ExecutiveReportRunDetail = {
  id: string;
  title: string;
  type: string;
  status: string;
  periodLabel: string | null;
  generatedAt: string;
  data: Prisma.JsonValue;
};

async function getCurrentTenantId() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      tenantId: true,
    },
  });

  return user?.tenantId ?? null;
}

export async function getTenantExecutiveReportRun(
  reportId: string
): Promise<ExecutiveReportRunDetail | null> {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    return null;
  }

  const reportRun = await prisma.reportRun.findFirst({
    where: {
      id: reportId,
      tenantId,
      type: "EXECUTIVE",
      status: "GENERATED",
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      periodLabel: true,
      generatedAt: true,
      data: true,
    },
  });

  if (!reportRun) {
    return null;
  }

  return {
    id: reportRun.id,
    title: reportRun.title,
    type: reportRun.type,
    status: reportRun.status,
    periodLabel: reportRun.periodLabel,
    generatedAt: reportRun.generatedAt.toISOString(),
    data: reportRun.data,
  };
}
