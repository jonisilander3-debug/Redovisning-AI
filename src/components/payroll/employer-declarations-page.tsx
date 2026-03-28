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
import { formatAccountingAmount } from "@/lib/accounting";

type EmployerDeclarationsPageProps = {
  companySlug: string;
  declarationRuns: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    totalGrossSalary: string;
    totalTax: string;
    totalEmployerContribution: string;
    employeeCount: number;
    payrollRunCount: number;
  }>;
};

export function EmployerDeclarationsPage({
  companySlug,
  declarationRuns,
}: EmployerDeclarationsPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/payroll-declarations`, {
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
        setError(data.message ?? "We could not create that declaration run.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Arbetsgivardeklaration"
        title="Prepare payroll reporting by period"
        description="Build AGI-ready declaration runs from finalized payroll, review employee totals, and move them from draft to ready and submitted."
      />

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">New declaration run</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Aggregate finalized payroll
          </h2>
        </div>
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
          <TextField label="Period start" name="periodStart" type="date" required />
          <TextField label="Period end" name="periodEnd" type="date" required />
          <div className="flex items-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create declaration"}
            </Button>
          </div>
        </form>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      </Card>

      {declarationRuns.length === 0 ? (
        <EmptyState
          title="No declaration runs yet"
          description="Finalize payroll first, then create the first declaration period from those payroll runs."
        />
      ) : null}

      <div className="space-y-3">
        {declarationRuns.map((run) => (
          <Link
            key={run.id}
            href={`/workspace/${companySlug}/payroll/declarations/${run.id}`}
            className="block"
          >
            <Card className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {run.periodStart.slice(0, 10)}-{run.periodEnd.slice(0, 10)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {run.employeeCount} employees · {run.payrollRunCount} payroll runs
                  </p>
                </div>
                <StatusBadge label={run.statusLabel} tone={run.statusTone} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Gross salary</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">{formatAccountingAmount(run.totalGrossSalary)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Tax</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">{formatAccountingAmount(run.totalTax)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Employer fee</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">{formatAccountingAmount(run.totalEmployerContribution)}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
