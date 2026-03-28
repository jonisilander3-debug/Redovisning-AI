"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { formatAccountingAmount } from "@/lib/accounting";

type YearEndPageProps = {
  companySlug: string;
  companyName: string;
  year: number;
  legalFormLabel: string;
  taxModeLabel: string;
  summary: {
    revenue: string;
    expenses: string;
    resultBeforeTax: string;
    estimatedTaxRatePercent: string;
    estimatedTax: string;
    resultAfterTax: string;
    hasExistingTaxEntry: boolean;
    existingTaxEntryDate: string | null;
  };
  accountOptions: Array<{ label: string; value: string }>;
  adjustments: Array<{
    id: string;
    typeLabel: string;
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    date: string;
    description: string;
    amount: string;
    debitAccountLabel: string;
    creditAccountLabel: string;
    note: string | null;
  }>;
  ink2Run: {
    id: string;
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    exportedAt: string | null;
    lines: Array<{
      id: string;
      code: string;
      label: string;
      amount: string;
    }>;
  } | null;
};

export function YearEndPage({
  companySlug,
  companyName,
  year,
  legalFormLabel,
  taxModeLabel,
  summary,
  accountOptions,
  adjustments,
  ink2Run,
}: YearEndPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [ink2Error, setInk2Error] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreateTaxEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/accounting/year-end/tax-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(formData.get("year") ?? year) }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Vi kunde inte skapa arsbokslutsposten.");
        return;
      }

      router.refresh();
    });
  }

  function handleCreateAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdjustmentError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/accounting/year-end/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          type: String(formData.get("type") ?? "MANUAL"),
          date: String(formData.get("date") ?? ""),
          description: String(formData.get("description") ?? ""),
          amount: Number(formData.get("amount") ?? 0),
          debitAccountId: String(formData.get("debitAccountId") ?? ""),
          creditAccountId: String(formData.get("creditAccountId") ?? ""),
          note: String(formData.get("note") ?? ""),
          status: "POSTED",
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setAdjustmentError(data.message ?? "Vi kunde inte skapa bokslutsjusteringen.");
        return;
      }

      (event.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  function handleCreateInk2() {
    setInk2Error(null);
    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/accounting/ink2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setInk2Error(data.message ?? "Vi kunde inte bygga INK2-underlaget.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Arsbokslut"
        title={`Year-end foundation for ${year}`}
        description={`${companyName} can now estimate current tax, post year-end adjustments, and keep a declaration-ready INK2 draft in the same accounting flow.`}
        actions={
          <StatusBadge
            label={summary.hasExistingTaxEntry ? "Tax entry posted" : "Tax entry not posted"}
            tone={summary.hasExistingTaxEntry ? "success" : "accent"}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Legal form</p>
          <p className="text-xl font-semibold text-[var(--color-foreground)]">{legalFormLabel}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">{taxModeLabel}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Revenue</p>
          <p className="text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(summary.revenue)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Expenses</p>
          <p className="text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(summary.expenses)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Result before tax</p>
          <p className="text-xl font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(summary.resultBeforeTax)}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Tax adjustment</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Post current tax for the year
            </h2>
          </div>
          <form className="space-y-4" onSubmit={handleCreateTaxEntry}>
            <TextField label="Financial year" name="year" type="number" defaultValue={String(year)} required />
            <div className="space-y-3 rounded-[20px] bg-[var(--color-surface)] p-4">
              <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                <span>Estimated tax rate</span>
                <span>{summary.estimatedTaxRatePercent}%</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                <span>Estimated tax</span>
                <span>{formatAccountingAmount(summary.estimatedTax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-base font-semibold text-[var(--color-foreground)]">
                <span>Result after tax</span>
                <span>{formatAccountingAmount(summary.resultAfterTax)}</span>
              </div>
            </div>
            {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
            <Button type="submit" disabled={isPending || summary.hasExistingTaxEntry}>
              {summary.hasExistingTaxEntry ? "Tax entry already posted" : isPending ? "Posting..." : "Create year-end tax entry"}
            </Button>
          </form>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">INK2-ready view</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Keep tax values traceable
            </h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-foreground)]">Net sales</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{formatAccountingAmount(summary.revenue)}</p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-foreground)]">Operating expenses</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{formatAccountingAmount(summary.expenses)}</p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-foreground)]">Estimated current tax</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{formatAccountingAmount(summary.estimatedTax)}</p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[var(--color-foreground)]">INK2 draft</p>
                {ink2Run ? <StatusBadge label={ink2Run.statusLabel} tone={ink2Run.statusTone} /> : null}
              </div>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {ink2Run?.exportedAt ? `Exported ${ink2Run.exportedAt.slice(0, 10)}` : "No INK2 draft has been built yet."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={isPending} onClick={handleCreateInk2}>
                  {isPending ? "Building..." : "Create or refresh INK2"}
                </Button>
                {ink2Run ? (
                  <a
                    href={`/api/workspace/${companySlug}/accounting/ink2/${ink2Run.id}/export`}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-foreground)]"
                  >
                    Export INK2
                  </a>
                ) : null}
              </div>
              {ink2Error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{ink2Error}</p> : null}
            </div>
            {ink2Run ? (
              <div className="space-y-2 rounded-[20px] bg-[var(--color-surface)] p-4">
                {ink2Run.lines.map((line) => (
                  <div key={line.id} className="grid gap-3 rounded-[16px] bg-white px-4 py-3 sm:grid-cols-[0.25fr_1fr_0.35fr]">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">{line.code}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{line.label}</p>
                    <p className="text-sm text-right font-semibold text-[var(--color-foreground)]">{formatAccountingAmount(line.amount)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Year-end adjustments</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Post accruals, prepaids and appropriations
            </h2>
          </div>
          <form className="space-y-4" onSubmit={handleCreateAdjustment}>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Adjustment type"
                name="type"
                options={[
                  { label: "Forutbetald kostnad", value: "PREPAID_EXPENSE" },
                  { label: "Upplupen kostnad", value: "ACCRUED_EXPENSE" },
                  { label: "Bokslutsdisposition", value: "APPROPRIATION" },
                  { label: "Skattejustering", value: "TAX" },
                  { label: "Manuell bokslutspost", value: "MANUAL" },
                ]}
              />
              <TextField label="Booking date" name="date" type="date" required />
              <TextField label="Description" name="description" required />
              <TextField label="Amount" name="amount" type="number" min="0.01" step="0.01" required />
              <SelectField label="Debit account" name="debitAccountId" options={accountOptions} />
              <SelectField label="Credit account" name="creditAccountId" options={accountOptions} />
            </div>
            <TextAreaField label="Note" name="note" placeholder="Internal note for the year-end adjustment" />
            {adjustmentError ? <p className="text-sm text-[var(--color-danger)]">{adjustmentError}</p> : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Posting..." : "Create year-end adjustment"}
            </Button>
          </form>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Posted adjustments</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Keep closing entries traceable
            </h2>
          </div>
          <div className="space-y-3">
            {adjustments.map((adjustment) => (
              <div key={adjustment.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{adjustment.description}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {adjustment.typeLabel} · {adjustment.date.slice(0, 10)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Debet {adjustment.debitAccountLabel} · Kredit {adjustment.creditAccountLabel}
                    </p>
                    {adjustment.note ? (
                      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{adjustment.note}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={adjustment.statusLabel} tone={adjustment.statusTone} />
                    <StatusBadge label={formatAccountingAmount(adjustment.amount)} tone="primary" />
                  </div>
                </div>
              </div>
            ))}
            {adjustments.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No year-end adjustments have been posted for this year yet.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
