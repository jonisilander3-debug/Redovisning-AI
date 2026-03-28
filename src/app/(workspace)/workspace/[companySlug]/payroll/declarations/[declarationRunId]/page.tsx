import { notFound } from "next/navigation";
import { EmployerDeclarationDetailPage } from "@/components/payroll/employer-declaration-detail-page";
import { requireProjectManagementAccess } from "@/lib/access";
import {
  employerDeclarationStatusLabels,
  getEmployerDeclarationStatusTone,
} from "@/lib/employer-declarations";
import { prisma } from "@/lib/prisma";

export default async function EmployerDeclarationDetailWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string; declarationRunId: string }>;
}) {
  const { companySlug, declarationRunId } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const declaration = await prisma.employerDeclarationRun.findFirst({
    where: {
      id: declarationRunId,
      companyId: viewer.company.id,
    },
    include: {
      lines: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
      payrollRuns: {
        include: {
          payrollRun: {
            select: {
              id: true,
              title: true,
              periodStart: true,
              periodEnd: true,
            },
          },
        },
        orderBy: {
          payrollRun: {
            periodEnd: "asc",
          },
        },
      },
    },
  });

  if (!declaration) {
    notFound();
  }

  return (
    <EmployerDeclarationDetailPage
      companySlug={companySlug}
      declaration={{
        id: declaration.id,
        periodStart: declaration.periodStart.toISOString(),
        periodEnd: declaration.periodEnd.toISOString(),
        status: declaration.status,
        statusLabel: employerDeclarationStatusLabels[declaration.status],
        statusTone: getEmployerDeclarationStatusTone(declaration.status),
        exportFormat: declaration.exportFormat,
        exportedAt: declaration.exportedAt?.toISOString() ?? null,
        submissionReference: declaration.submissionReference,
        submittedAt: declaration.submittedAt?.toISOString() ?? null,
        totalGrossSalary: declaration.totalGrossSalary.toString(),
        totalTax: declaration.totalTax.toString(),
        totalEmployerContribution: declaration.totalEmployerContribution.toString(),
        payrollRuns: declaration.payrollRuns.map((link) => ({
          id: link.payrollRun.id,
          title: link.payrollRun.title,
          periodStart: link.payrollRun.periodStart.toISOString(),
          periodEnd: link.payrollRun.periodEnd.toISOString(),
        })),
        lines: declaration.lines.map((line) => ({
          id: line.id,
          userName: line.user.name,
          grossSalary: line.grossSalary.toString(),
          taxAmount: line.taxAmount.toString(),
          employerContribution: line.employerContribution.toString(),
          absenceAdjustmentAmount: line.absenceAdjustmentAmount.toString(),
          benefitsAmount: line.benefitsAmount.toString(),
        })),
      }}
    />
  );
}
