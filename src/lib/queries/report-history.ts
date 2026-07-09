import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";

export type ReportHistoryItem = {
  id: string;
  type: string;
  status: string;
  title: string;
  periodLabel: string | null;
  generatedAt: string;
};

export type ReportHistoryData = {
  hasTenant: boolean;
  tenantName: string | null;
  reports: ReportHistoryItem[];
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

export async function getTenantReportHistory(): Promise<ReportHistoryData> {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    return {
      hasTenant: false,
      tenantName: null,
      reports: [],
    };
  }

  const [tenant, reportRuns] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),

    prisma.reportRun.findMany({
      where: { tenantId },
      orderBy: { generatedAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        periodLabel: true,
        generatedAt: true,
      },
    }),
  ]);

  return {
    hasTenant: true,
    tenantName: tenant?.name ?? null,
    reports: reportRuns.map((report) => ({
      id: report.id,
      type: report.type,
      status: report.status,
      title: report.title,
      periodLabel: report.periodLabel,
      generatedAt: report.generatedAt.toISOString(),
    })),
  };
}
