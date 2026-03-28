import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAccountingAmount } from "@/lib/accounting";
import { formatDateLabel } from "@/lib/time-tracking";

type EmployeePayrollPageProps = {
  companySlug: string;
  companyName: string;
  payslips: Array<{
    payrollRunId: string;
    payrollLineId: string;
    periodStart: Date;
    periodEnd: Date;
    grossSalary: string;
    taxAmount: string;
    netSalary: string;
    paymentStatusLabel: string;
    paymentStatusTone: "default" | "primary" | "accent" | "success" | "danger";
  }>;
};

export function EmployeePayrollPage({
  companySlug,
  companyName,
  payslips,
}: EmployeePayrollPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Min lon"
        title="Se dina lonebesked"
        description={`${companyName} samlar dina perioder, nettolon och utbetalningsstatus pa ett stalle.`}
      />

      {payslips.length === 0 ? (
        <EmptyState
          title="No payslips yet"
          description="Your finalized payroll runs will appear here as soon as payroll has been prepared."
        />
      ) : null}

      <div className="space-y-3">
        {payslips.map((payslip) => (
          <Link
            key={payslip.payrollLineId}
            href={`/workspace/${companySlug}/payroll/${payslip.payrollRunId}/payslips/${payslip.payrollLineId}`}
            className="block"
          >
            <Card className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {formatDateLabel(payslip.periodStart)}-{formatDateLabel(payslip.periodEnd)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Gross {formatAccountingAmount(payslip.grossSalary)} · Tax {formatAccountingAmount(payslip.taxAmount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={payslip.paymentStatusLabel} tone={payslip.paymentStatusTone} />
                  <StatusBadge label={formatAccountingAmount(payslip.netSalary)} tone="primary" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
