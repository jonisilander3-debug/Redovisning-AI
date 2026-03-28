import { EmployeePayrollPage } from "@/components/payroll/employee-payroll-page";
import { requireWorkspaceAccess } from "@/lib/access";
import {
  getPayrollPaymentStatusTone,
  payrollPaymentStatusLabels,
} from "@/lib/payroll";
import { prisma } from "@/lib/prisma";

export default async function MyPayrollPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireWorkspaceAccess(companySlug);

  const payslips = await prisma.payrollLine.findMany({
    where: {
      companyId: viewer.company.id,
      userId: viewer.id,
      payrollRun: {
        status: {
          in: ["FINALIZED", "PAID"],
        },
      },
    },
    include: {
      payrollRun: {
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
        },
      },
    },
    orderBy: [{ payrollRun: { periodEnd: "desc" } }],
  });

  return (
    <EmployeePayrollPage
      companySlug={companySlug}
      companyName={viewer.company.name}
      payslips={payslips.map((line) => ({
        payrollRunId: line.payrollRunId,
        payrollLineId: line.id,
        periodStart: line.payrollRun.periodStart,
        periodEnd: line.payrollRun.periodEnd,
        grossSalary: line.grossSalary.toString(),
        taxAmount: line.taxAmount.toString(),
        netSalary: line.netSalary.toString(),
        paymentStatusLabel: payrollPaymentStatusLabels[line.paymentStatus],
        paymentStatusTone: getPayrollPaymentStatusTone(line.paymentStatus),
      }))}
    />
  );
}
