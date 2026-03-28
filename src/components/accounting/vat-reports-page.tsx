"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { formatAccountingAmount } from "@/lib/accounting";

type VatReportsPageProps = {
  companySlug: string;
  reports: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    status: "DRAFT" | "READY" | "FILED";
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    outputVat25: string;
    inputVat: string;
    netVatPayable: string;
    journalEntryCount: number;
    correctionOfLabel: string | null;
    lockedAt: string | null;
    filedAt: string | null;
    settledAt: string | null;
    exportedAt: string | null;
    adjustments: Array<{
      id: string;
      description: string;
      outputVatDelta: string;
      inputVatDelta: string;
      date: string;
    }>;
  }>;
};

export function VatReportsPage({ companySlug, reports }: VatReportsPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/accounting/vat`, {
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
        setError(data.message ?? "We could not create that VAT report.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  function updateStatus(reportId: string, status: "READY" | "FILED") {
    startTransition(async () => {
      await fetch(`/api/workspace/${companySlug}/accounting/vat/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
  }

  function handleCreateAdjustment(reportId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/accounting/vat/${reportId}/adjustments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: String(formData.get("adjustmentDate") ?? ""),
            description: String(formData.get("adjustmentDescription") ?? ""),
            outputVatDelta: Number(formData.get("outputVatDelta") ?? 0),
            inputVatDelta: Number(formData.get("inputVatDelta") ?? 0),
          }),
        },
      );

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "VAT correction could not be created.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Moms"
        title="Build VAT reports from posted accounting"
        description="Use actual BAS postings to see output VAT, input VAT, and the net amount payable or refundable for each period."
      />

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">New VAT report</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Choose a reporting period
          </h2>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          <TextField label="Period start" name="periodStart" type="date" required />
          <TextField label="Period end" name="periodEnd" type="date" required />
          <SelectField
            label="Correction of report"
            name="correctionOfVatReportRunId"
            defaultValue=""
            options={[
              { label: "No correction, create normal period", value: "" },
              ...reports.map((report) => ({
                label: `${report.periodStart.slice(0, 10)}-${report.periodEnd.slice(0, 10)} (${report.statusLabel})`,
                value: report.id,
              })),
            ]}
          />
          <div className="flex items-end md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create VAT report"}
            </Button>
          </div>
        </form>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      </Card>

      {reports.length === 0 ? (
        <EmptyState
          title="No VAT reports yet"
          description="Posted entries on 2611 and 2641 will be collected here when you create the first VAT period."
        />
      ) : null}

      <div className="space-y-3">
        {reports.map((report) => (
          <Card key={report.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">
                  {report.periodStart.slice(0, 10)}-{report.periodEnd.slice(0, 10)}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {report.journalEntryCount} verifikationer i underlaget
                </p>
                {report.correctionOfLabel ? (
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Korrigering av {report.correctionOfLabel}
                  </p>
                ) : null}
              </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={report.statusLabel} tone={report.statusTone} />
              <a
                href={`/api/workspace/${companySlug}/accounting/vat/${report.id}/export`}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-foreground)]"
              >
                Export
              </a>
              {report.status === "DRAFT" ? (
                  <Button type="button" variant="secondary" disabled={isPending} onClick={() => updateStatus(report.id, "READY")}>
                    Mark ready
                  </Button>
                ) : null}
                {report.status === "READY" ? (
                  <Button type="button" disabled={isPending} onClick={() => updateStatus(report.id, "FILED")}>
                    Mark filed
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Output VAT 25%</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(report.outputVat25)}</p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Input VAT</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(report.inputVat)}</p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Net VAT</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(report.netVatPayable)}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Locked</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                  {report.lockedAt ? report.lockedAt.slice(0, 10) : "Not locked"}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Filed</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                  {report.filedAt ? report.filedAt.slice(0, 10) : "Not filed"}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">VAT settlement</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                  {report.settledAt ? report.settledAt.slice(0, 10) : "Not settled"}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Exported</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                  {report.exportedAt ? report.exportedAt.slice(0, 10) : "Not exported"}
                </p>
              </div>
            </div>
            {report.status !== "DRAFT" ? (
              <div className="space-y-4 rounded-[20px] bg-[var(--color-surface)] p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    VAT correction
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Create a formal rebooking against locked VAT periods.
                  </p>
                </div>
                <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => handleCreateAdjustment(report.id, event)}>
                  <TextField label="Correction date" name="adjustmentDate" type="date" required />
                  <TextField label="Output VAT delta" name="outputVatDelta" type="number" step="0.01" defaultValue="0" />
                  <TextField label="Input VAT delta" name="inputVatDelta" type="number" step="0.01" defaultValue="0" />
                  <TextField label="Description" name="adjustmentDescription" required />
                  <div className="md:col-span-4">
                    <Button type="submit" variant="secondary" disabled={isPending}>
                      {isPending ? "Saving..." : "Create VAT correction"}
                    </Button>
                  </div>
                </form>
                <div className="space-y-2">
                  {report.adjustments.map((adjustment) => (
                    <div key={adjustment.id} className="rounded-[18px] bg-white px-4 py-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-foreground)]">{adjustment.description}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">{adjustment.date.slice(0, 10)}</p>
                        </div>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          Utg moms {formatAccountingAmount(adjustment.outputVatDelta)} · Ing moms {formatAccountingAmount(adjustment.inputVatDelta)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {report.adjustments.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      No VAT corrections have been posted for this report yet.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
