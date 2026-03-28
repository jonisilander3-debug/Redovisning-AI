import { EmployerDeclarationsPage } from "@/components/payroll/employer-declarations-page";
import { requireProjectManagementAccess } from "@/lib/access";
import {
  employerDeclarationStatusLabels,
  getEmployerDeclarationStatusTone,
} from "@/lib/employer-declarations";
import { prisma } from "@/lib/prisma";

export default async function EmployerDeclarationsIndexPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const declarationRuns = await prisma.employerDeclarationRun.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      _count: {
        select: {
          lines: true,
          payrollRuns: true,
        },
      },
    },
    orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
  });

  return (
    <EmployerDeclarationsPage
      companySlug={companySlug}
      declarationRuns={declarationRuns.map((run) => ({
        id: run.id,
        periodStart: run.periodStart.toISOString(),
        periodEnd: run.periodEnd.toISOString(),
        statusLabel: employerDeclarationStatusLabels[run.status],
        statusTone: getEmployerDeclarationStatusTone(run.status),
        totalGrossSalary: run.totalGrossSalary.toString(),
        totalTax: run.totalTax.toString(),
        totalEmployerContribution: run.totalEmployerContribution.toString(),
        employeeCount: run._count.lines,
        payrollRunCount: run._count.payrollRuns,
      }))}
    />
  );
}
