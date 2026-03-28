"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { formatAccountingAmount } from "@/lib/accounting";

type Ink2PageProps = {
  companySlug: string;
  runs: Array<{
    id: string;
    year: number;
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    exportFormat: string | null;
    exportedAt: string | null;
    lines: Array<{
      id: string;
      code: string;
      label: string;
      amount: string;
    }>;
  }>;
};

export function Ink2Page({ companySlug, runs }: Ink2PageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/accounting/ink2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(formData.get("year") ?? new Date().getFullYear()),
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "INK2-underlaget kunde inte skapas.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="INK2"
        title="Map bookkeeping into a Swedish tax return draft"
        description="Keep a structured INK2-ready line mapping from posted bookkeeping and year-end adjustments."
      />

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">New INK2 draft</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Build tax return mapping for a year
          </h2>
        </div>
        <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleCreate}>
          <div className="min-w-[220px]">
            <TextField label="Financial year" name="year" type="number" defaultValue={String(new Date().getFullYear())} required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Building..." : "Create or refresh INK2 draft"}
          </Button>
        </form>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      </Card>

      {runs.length === 0 ? (
        <EmptyState
          title="No INK2 drafts yet"
          description="Create the first draft to map posted bookkeeping into a tax-return-ready structure."
        />
      ) : null}

      <div className="space-y-4">
        {runs.map((run) => (
          <Card key={run.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">{run.year}</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {run.exportedAt
                    ? `Exported ${run.exportedAt.slice(0, 10)}${run.exportFormat ? ` · ${run.exportFormat}` : ""}`
                    : "Not exported yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={run.statusLabel} tone={run.statusTone} />
                <a
                  href={`/api/workspace/${companySlug}/accounting/ink2/${run.id}/export`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-foreground)]"
                >
                  Export
                </a>
              </div>
            </div>

            <div className="space-y-2">
              {run.lines.map((line) => (
                <div key={line.id} className="grid gap-3 rounded-[18px] bg-[var(--color-surface)] px-4 py-3 sm:grid-cols-[0.2fr_1fr_0.35fr]">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">{line.code}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{line.label}</p>
                  <p className="text-sm text-right font-semibold text-[var(--color-foreground)]">
                    {formatAccountingAmount(line.amount)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
