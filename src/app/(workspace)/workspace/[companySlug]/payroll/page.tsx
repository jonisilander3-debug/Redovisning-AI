import { PayrollPage } from "@/components/payroll/payroll-page";
import { requireProjectManagementAccess } from "@/lib/access";
import {
  getPayrollPaymentStatusTone,
  getPayrollRunStatusTone,
  payrollPaymentStatusLabels,
  payrollRunStatusLabels,
} from "@/lib/payroll";
import { prisma } from "@/lib/prisma";

export default async function WorkspacePayrollPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const payrollRuns = await prisma.payrollRun.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      lines: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              salaryType: true,
            },
          },
          timeEntries: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
    },
    orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
  });

  return (
    <PayrollPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      companyBankExportProfile={viewer.company.bankExportProfile}
      payrollRuns={payrollRuns.map((run) => ({
        id: run.id,
        title: run.title,
        status: run.status,
        statusLabel: payrollRunStatusLabels[run.status],
        statusTone: getPayrollRunStatusTone(run.status),
        periodStart: run.periodStart.toISOString(),
        periodEnd: run.periodEnd.toISOString(),
        totalGross: run.totalGross.toString(),
        totalTax: run.totalTax.toString(),
        totalEmployerContribution: run.totalEmployerContribution.toString(),
        totalNet: run.totalNet.toString(),
        finalizedAt: run.finalizedAt?.toISOString() ?? null,
        journalEntryId: run.journalEntryId,
        lines: run.lines.map((line) => ({
          id: line.id,
          userId: line.user.id,
          userName: line.user.name,
          salaryTypeLabel: line.user.salaryType === "MONTHLY" ? "Manadslon" : "Timlon",
          hoursWorked: line.hoursWorked.toString(),
          absenceHours: line.absenceHours.toString(),
          absenceAdjustmentAmount: line.absenceAdjustmentAmount.toString(),
          benefitsAmount: line.benefitsAmount.toString(),
          vacationPayAmount: line.vacationPayAmount.toString(),
          karensDeductionAmount: line.karensDeductionAmount.toString(),
          grossSalary: line.grossSalary.toString(),
          taxAmount: line.taxAmount.toString(),
          employerContribution: line.employerContribution.toString(),
          netSalary: line.netSalary.toString(),
          timeEntryCount: line.timeEntries.length,
          paymentStatusLabel: payrollPaymentStatusLabels[line.paymentStatus],
          paymentStatusTone: getPayrollPaymentStatusTone(line.paymentStatus),
          payoutReference: line.payoutReference,
        })),
      }))}
    />
  );
}
