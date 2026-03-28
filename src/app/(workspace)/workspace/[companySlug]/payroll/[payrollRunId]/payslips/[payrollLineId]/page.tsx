import { notFound } from "next/navigation";
import { PayslipPage } from "@/components/payroll/payslip-page";
import { requireWorkspaceAccess } from "@/lib/access";
import {
  getPayrollPaymentStatusTone,
  payrollPaymentStatusLabels,
} from "@/lib/payroll";
import { prisma } from "@/lib/prisma";

export default async function PayrollPayslipPage({
  params,
}: {
  params: Promise<{ companySlug: string; payrollRunId: string; payrollLineId: string }>;
}) {
  const { companySlug, payrollRunId, payrollLineId } = await params;
  const viewer = await requireWorkspaceAccess(companySlug);

  const payrollLine = await prisma.payrollLine.findFirst({
    where: {
      id: payrollLineId,
      payrollRunId,
      companyId: viewer.company.id,
      ...(viewer.role === "EMPLOYEE" ? { userId: viewer.id } : {}),
    },
    include: {
      payrollRun: {
        select: {
          id: true,
          title: true,
          periodStart: true,
          periodEnd: true,
          finalizedAt: true,
          createdAt: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
      company: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!payrollLine) {
    notFound();
  }

  return (
    <PayslipPage
      companySlug={companySlug}
      payslip={{
        companyName: payrollLine.company.name,
        employeeName: payrollLine.user.name,
        payrollRunTitle: payrollLine.payrollRun.title,
        periodStart: payrollLine.payrollRun.periodStart,
        periodEnd: payrollLine.payrollRun.periodEnd,
        createdAt: payrollLine.payrollRun.createdAt,
        finalizedAt: payrollLine.payrollRun.finalizedAt,
        hoursWorked: payrollLine.hoursWorked.toString(),
        absenceHours: payrollLine.absenceHours.toString(),
        absenceAdjustmentAmount: payrollLine.absenceAdjustmentAmount.toString(),
        benefitsAmount: payrollLine.benefitsAmount.toString(),
        vacationPayAmount: payrollLine.vacationPayAmount.toString(),
        karensDeductionAmount: payrollLine.karensDeductionAmount.toString(),
        grossSalary: payrollLine.grossSalary.toString(),
        taxAmount: payrollLine.taxAmount.toString(),
        employerContribution: payrollLine.employerContribution.toString(),
        netSalary: payrollLine.netSalary.toString(),
        paymentStatusLabel: payrollPaymentStatusLabels[payrollLine.paymentStatus],
        paymentStatusTone: getPayrollPaymentStatusTone(payrollLine.paymentStatus),
        payoutReference: payrollLine.payoutReference,
      }}
    />
  );
}
