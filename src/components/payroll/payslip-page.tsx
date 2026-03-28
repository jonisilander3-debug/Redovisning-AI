import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAccountingAmount } from "@/lib/accounting";
import { formatDateLabel } from "@/lib/time-tracking";

type PayslipPageProps = {
  companySlug: string;
  payslip: {
    companyName: string;
    employeeName: string;
    payrollRunTitle: string;
    periodStart: Date;
    periodEnd: Date;
    createdAt: Date;
    finalizedAt: Date | null;
    hoursWorked: string;
    absenceHours: string;
    absenceAdjustmentAmount: string;
    benefitsAmount: string;
    vacationPayAmount: string;
    karensDeductionAmount: string;
    grossSalary: string;
    taxAmount: string;
    employerContribution: string;
    netSalary: string;
    paymentStatusLabel: string;
    paymentStatusTone: "default" | "primary" | "accent" | "success" | "danger";
    payoutReference: string | null;
  };
};

export function PayslipPage({ payslip }: PayslipPageProps) {
  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        eyebrow="Lonbesked"
        title={payslip.employeeName}
        description={`${payslip.companyName} · ${formatDateLabel(payslip.periodStart)}-${formatDateLabel(payslip.periodEnd)}`}
        actions={<StatusBadge label={payslip.paymentStatusLabel} tone={payslip.paymentStatusTone} />}
      />

      <Card className="space-y-5 print:shadow-none">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Lonekorning</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">{payslip.payrollRunTitle}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Skapad</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">{formatDateLabel(payslip.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Finaliserad</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">
              {payslip.finalizedAt ? formatDateLabel(payslip.finalizedAt) : "Inte finaliserad"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Utbetalningsreferens</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">
              {payslip.payoutReference ?? "Inte satt"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Arbetade timmar</p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">{payslip.hoursWorked} h</p>
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Franvaro</p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">{payslip.absenceHours} h</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Justering {formatAccountingAmount(payslip.absenceAdjustmentAmount)}
            </p>
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Nettolon</p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(payslip.netSalary)}</p>
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Semesterersattning</p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(payslip.vacationPayAmount)}</p>
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Karensavdrag</p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(payslip.karensDeductionAmount)}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-[20px] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
            <span>Bruttolon</span>
            <span>{formatAccountingAmount(payslip.grossSalary)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
            <span>Skatt</span>
            <span>{formatAccountingAmount(payslip.taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
            <span>Arbetsgivaravgift</span>
            <span>{formatAccountingAmount(payslip.employerContribution)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
            <span>Formaner / tillagg</span>
            <span>{formatAccountingAmount(payslip.benefitsAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-base font-semibold text-[var(--color-foreground)]">
            <span>Att betala ut</span>
            <span>{formatAccountingAmount(payslip.netSalary)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
