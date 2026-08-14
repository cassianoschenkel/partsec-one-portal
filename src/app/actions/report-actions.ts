"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma, ReportStatus, ReportType, UserRole } from "@/generated/prisma/client";
import { getExecutiveReportForTenant } from "@/lib/queries/executive-report";
import {
  buildExecutiveReportSnapshot,
  toReportRunJson,
} from "@/lib/report-snapshot";
import { assertTenantMutationRole, AuthorizationError } from "@/lib/authz/rules";
import { requireActiveUser } from "@/lib/authz/server-authorization";

export async function generateExecutiveReportAction() {
  let user;

  try {
    user = await requireActiveUser();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/login");
    }

    throw error;
  }

  if (user.role === UserRole.PARTSEC_ADMIN) {
    redirect("/admin/tenants");
  }

  try {
    assertTenantMutationRole(user);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/reports/history");
    }

    throw error;
  }

  const tenantId = user.tenantId;

  const generatedAt = new Date();

  const reportRun = await prisma.reportRun.create({
    data: {
      tenantId,
      type: ReportType.EXECUTIVE,
      status: ReportStatus.DRAFT,
      title: "Relatório Executivo",
      periodLabel: "Visão atual",
      generatedAt,
      data: Prisma.DbNull,
      fileUrl: null,
    },
    select: { id: true },
  });

  let redirectUrl: string;

  try {
    const report = await getExecutiveReportForTenant(tenantId);

    if (!report.hasTenant) {
      throw new Error(
        "Tenant não encontrado ao gerar o Relatório Executivo."
      );
    }

    const snapshot = buildExecutiveReportSnapshot(report, generatedAt);

    await prisma.reportRun.update({
      where: { id: reportRun.id },
      data: {
        status: ReportStatus.GENERATED,
        data: toReportRunJson(snapshot),
      },
    });

    redirectUrl = "/reports/history?generation=success";
  } catch (error) {
    console.error("Falha ao gerar Relatório Executivo:", error);

    try {
      await prisma.reportRun.update({
        where: { id: reportRun.id },
        data: {
          status: ReportStatus.FAILED,
          data: Prisma.DbNull,
        },
      });
    } catch (updateError) {
      console.error(
        "Falha ao registrar status FAILED do Relatório Executivo:",
        updateError
      );
      throw updateError;
    }

    redirectUrl = "/reports/history?generation=failed";
  }

  revalidatePath("/reports/history");
  redirect(redirectUrl);
}
