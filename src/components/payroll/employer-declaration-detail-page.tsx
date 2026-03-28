"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAccountingAmount } from "@/lib/accounting";

type EmployerDeclarationDetailPageProps = {
  companySlug: string;
  declaration: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: "DRAFT" | "READY" | "SUBMITTED";
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    exportFormat: string | null;
    exportedAt: string | null;
    submissionReference: string | null;
    submittedAt: string | null;
    totalGrossSalary: string;
    totalTax: string;
    totalEmployerContribution: string;
    payrollRuns: Array<{
      id: string;
      title: string;
      periodStart: string;
      periodEnd: string;
    }>;
    lines: Array<{
      id: string;
      userName: string;
      grossSalary: string;
      taxAmount: string;
      employerContribution: string;
      absenceAdjustmentAmount: string;
      benefitsAmount: string;
    }>;
  };
};

export function EmployerDeclarationDetailPage({
  companySlug,
  declaration,
}: EmployerDeclarationDetailPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus(status: "READY" | "SUBMITTED") {
    setError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/payroll-declarations/${declaration.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update the declaration.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Arbetsgivardeklaration"
        title={`${declaration.periodStart.slice(0, 10)}-${declaration.periodEnd.slice(0, 10)}`}
        description="Review payroll totals and employee-level reporting before you mark the declaration as ready or submitted."
        actions={<StatusBadge label={declaration.statusLabel} tone={declaration.statusTone} />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Gross salary</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(declaration.totalGrossSalary)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Tax</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(declaration.totalTax)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Employer fee</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(declaration.totalEmployerContribution)}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Export format</p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">{declaration.exportFormat ?? "Not exported yet"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Submitted reference</p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">{declaration.submissionReference ?? "Not submitted yet"}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Exported / submitted</p>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {(declaration.exportedAt ? declaration.exportedAt.slice(0, 10) : "No export") + " / " + (declaration.submittedAt ? declaration.submittedAt.slice(0, 10) : "No submission")}
          </p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Link href={`/api/workspace/${companySlug}/payroll-declarations/${declaration.id}/export`}>
            <Button type="button" variant="secondary">Export AGI file</Button>
          </Link>
          {declaration.status === "DRAFT" ? (
            <Button type="button" disabled={isPending} onClick={() => updateStatus("READY")}>
              {isPending ? "Saving..." : "Mark as ready"}
            </Button>
          ) : null}
          {declaration.status === "READY" ? (
            <Button type="button" disabled={isPending} onClick={() => updateStatus("SUBMITTED")}>
              {isPending ? "Saving..." : "Mark as submitted"}
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Included payroll runs</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">Traceability back to payroll</h2>
        </div>
        <div className="space-y-3">
          {declaration.payrollRuns.map((run) => (
            <div key={run.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-foreground)]">{run.title}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {run.periodStart.slice(0, 10)}-{run.periodEnd.slice(0, 10)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Employee lines</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">Reporting values per employee</h2>
        </div>
        <div className="space-y-3">
          {declaration.lines.map((line) => (
            <div key={line.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">{line.userName}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Absence adjustment {formatAccountingAmount(line.absenceAdjustmentAmount)} · Benefits {formatAccountingAmount(line.benefitsAmount)}
                  </p>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">Gross</p>
                    <p>{formatAccountingAmount(line.grossSalary)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">Tax</p>
                    <p>{formatAccountingAmount(line.taxAmount)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">Employer fee</p>
                    <p>{formatAccountingAmount(line.employerContribution)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
