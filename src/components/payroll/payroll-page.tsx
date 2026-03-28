"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import {
  formatAccountingAmount,
} from "@/lib/accounting";

type PayrollRunStatusTone = "default" | "primary" | "accent" | "success" | "danger";

type PayrollPageProps = {
  companySlug: string;
  companyName: string;
  companyBankExportProfile?: string;
  payrollRuns: Array<{
    id: string;
    title: string;
    status: "DRAFT" | "FINALIZED" | "PAID";
    statusLabel: string;
    statusTone: PayrollRunStatusTone;
    periodStart: string;
    periodEnd: string;
    totalGross: string;
    totalTax: string;
    totalEmployerContribution: string;
    totalNet: string;
    finalizedAt: string | null;
    journalEntryId: string | null;
    lines: Array<{
      id: string;
      userId: string;
      userName: string;
      salaryTypeLabel: string;
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
      timeEntryCount: number;
      paymentStatusLabel: string;
      paymentStatusTone: PayrollRunStatusTone;
      payoutReference: string | null;
    }>;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return value.slice(0, 10);
}

export function PayrollPage({
  companySlug,
  companyName,
  companyBankExportProfile,
  payrollRuns,
}: PayrollPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/payroll-runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodStart: String(formData.get("periodStart") ?? ""),
          periodEnd: String(formData.get("periodEnd") ?? ""),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not create that payroll run.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  function runAction(runId: string, action: "finalize" | "pay" | "payment-file") {
    setActionError(null);
    setActiveRunId(runId);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/payroll-runs/${runId}/${action}`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setActionError(data.message ?? "We could not update that payroll run.");
        setActiveRunId(null);
        return;
      }

      setActiveRunId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Payroll"
        title="Run payroll from worked time"
        description={`${companyName} can now turn approved time into salary lines, finalize payroll, and send the accounting entry straight into BAS bookkeeping.`}
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              New payroll run
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Choose a payroll period
            </h2>
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              We pull completed time for the period and calculate gross salary, tax, employer contribution, and net salary per employee.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleCreateRun}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Period start" name="periodStart" type="date" required />
              <TextField label="Period end" name="periodEnd" type="date" required />
            </div>

            {error ? (
              <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create payroll run"}
            </Button>
          </form>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Payroll flow
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Time to salary to bookkeeping
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-foreground)]">1. Time approved</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Completed time entries in the chosen period become payroll input.
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-foreground)]">2. Payroll finalized</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Gross salary, tax, employer fees, and net salary are locked in.
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-foreground)]">3. Accounting posted</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                One balanced BAS verification is created for the payroll run.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {actionError ? (
        <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {actionError}
        </div>
      ) : null}

      <div className="space-y-4">
        {payrollRuns.length === 0 ? (
          <EmptyState
            title="No payroll runs yet"
            description="Create the first payroll run to calculate salaries from worked time and post the accounting entry when you finalize it."
          />
        ) : null}

        {payrollRuns.map((run) => {
          const isRunPending = isPending && activeRunId === run.id;

          return (
            <Card key={run.id} className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                      {run.title}
                    </h2>
                    <StatusBadge label={run.statusLabel} tone={run.statusTone} />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {formatDate(run.periodStart)} to {formatDate(run.periodEnd)}
                    {run.finalizedAt ? ` · Finalized ${formatDate(run.finalizedAt)}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {run.status === "DRAFT" ? (
                    <Button
                      type="button"
                      disabled={isRunPending}
                      onClick={() => runAction(run.id, "finalize")}
                    >
                      {isRunPending ? "Saving..." : "Finalize payroll"}
                    </Button>
                  ) : null}
                  {run.status !== "DRAFT" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isRunPending}
                      onClick={() => runAction(run.id, "payment-file")}
                    >
                      {isRunPending ? "Saving..." : "Prepare payment file"}
                    </Button>
                  ) : null}
                  {run.status !== "DRAFT" ? (
                    <a
                      href={`/api/workspace/${companySlug}/payroll-runs/${run.id}/payment-file/export${companyBankExportProfile === "BANKGIROT_LON" ? "?profile=BANKGIROT_LON" : ""}`}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-foreground)]"
                    >
                      Export bank file
                    </a>
                  ) : null}
                  {run.status !== "DRAFT" ? (
                    <a
                      href={`/api/workspace/${companySlug}/payroll-runs/${run.id}/payment-file/export?profile=PAIN_001`}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-foreground)]"
                    >
                      Export pain.001
                    </a>
                  ) : null}
                  {run.status !== "DRAFT" ? (
                    <a
                      href={`/api/workspace/${companySlug}/payroll-runs/${run.id}/payment-file/export?profile=BANKGIROT_LON`}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-foreground)]"
                    >
                      Export Bankgirot
                    </a>
                  ) : null}
                  {run.status === "FINALIZED" ? (
                    <Button
                      type="button"
                      disabled={isRunPending}
                      onClick={() => runAction(run.id, "pay")}
                    >
                      {isRunPending ? "Saving..." : "Mark as paid"}
                    </Button>
                  ) : null}
                  {run.journalEntryId ? (
                    <Link href={`/workspace/${companySlug}/accounting/journal`}>
                      <Button type="button" variant="secondary">
                        View journal
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    Gross salary
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
                    {formatAccountingAmount(run.totalGross)}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    Tax
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
                    {formatAccountingAmount(run.totalTax)}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    Employer fees
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
                    {formatAccountingAmount(run.totalEmployerContribution)}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    Net salary
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
                    {formatAccountingAmount(run.totalNet)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                      Employee lines
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      Hours remain traceable to the completed time entries used in each salary line.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {run.lines.map((line) => (
                    <div key={line.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold text-[var(--color-foreground)]">
                            {line.userName}
                          </p>
                          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                            {line.salaryTypeLabel} · {line.hoursWorked} h · {line.timeEntryCount} time entries
                          </p>
                        </div>
                        <div className="grid gap-3 text-sm text-[var(--color-muted-foreground)] sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="font-medium text-[var(--color-foreground)]">Gross</p>
                          <p>{formatAccountingAmount(line.grossSalary)}</p>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-foreground)]">Absence</p>
                          <p>
                            {line.absenceHours} h · {formatAccountingAmount(line.absenceAdjustmentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-foreground)]">Tax</p>
                          <p>{formatAccountingAmount(line.taxAmount)}</p>
                          </div>
                          <div>
                            <p className="font-medium text-[var(--color-foreground)]">Employer fee</p>
                            <p>{formatAccountingAmount(line.employerContribution)}</p>
                          </div>
                          <div>
                          <p className="font-medium text-[var(--color-foreground)]">Net</p>
                          <p>{formatAccountingAmount(line.netSalary)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge label={line.paymentStatusLabel} tone={line.paymentStatusTone} />
                      {line.payoutReference ? (
                        <StatusBadge label={`Ref ${line.payoutReference}`} tone="primary" />
                      ) : null}
                      <Link
                        href={`/workspace/${companySlug}/payroll/${run.id}/payslips/${line.id}`}
                        className="text-sm font-medium text-[var(--color-primary)]"
                      >
                        Open payslip
                      </Link>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
