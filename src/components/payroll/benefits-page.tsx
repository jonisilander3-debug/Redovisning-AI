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

type BenefitsPageProps = {
  companySlug: string;
  members: Array<{ label: string; value: string }>;
  entries: Array<{
    id: string;
    userName: string;
    typeLabel: string;
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    description: string;
    taxableAmount: string;
    date: string;
  }>;
};

export function BenefitsPage({ companySlug, members, entries }: BenefitsPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/benefits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: String(formData.get("userId") ?? ""),
          type: String(formData.get("type") ?? ""),
          description: String(formData.get("description") ?? ""),
          taxableAmount: Number(formData.get("taxableAmount") ?? 0),
          date: String(formData.get("date") ?? ""),
          status: String(formData.get("status") ?? "DRAFT"),
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Vi kunde inte spara forman.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  function approveEntry(entryId: string) {
    setActionError(null);
    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/benefits/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setActionError(data.message ?? "Vi kunde inte godkanna forman.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Formaner"
        title="Track taxable benefits before payroll"
        description="Keep car, meal, health, and other taxable benefits visible before payroll is finalized."
      />

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Ny forman</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Lagg till beskattningsbar forman
          </h2>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="Medarbetare" name="userId" options={members} required />
            <SelectField
              label="Formanstyp"
              name="type"
              options={[
                { label: "Bilforman", value: "CAR" },
                { label: "Kostforman", value: "MEAL" },
                { label: "Halsoforman", value: "HEALTH" },
                { label: "Ovrigt", value: "OTHER" },
              ]}
            />
            <SelectField
              label="Status"
              name="status"
              options={[
                { label: "Utkast", value: "DRAFT" },
                { label: "Godkand", value: "APPROVED" },
              ]}
            />
            <TextField label="Datum" name="date" type="date" required />
            <TextField label="Beskattningsbart belopp" name="taxableAmount" type="number" min="0.01" step="0.01" required />
            <TextField label="Beskrivning" name="description" required />
          </div>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={isPending}>{isPending ? "Sparar..." : "Spara forman"}</Button>
        </form>
      </Card>

      {actionError ? <p className="text-sm text-[var(--color-danger)]">{actionError}</p> : null}

      {entries.length === 0 ? (
        <EmptyState
          title="Inga formaner an"
          description="Godkanda formaner hamnar i lonens beskattningsunderlag nar lonekorning skapas."
        />
      ) : null}

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">{entry.userName}</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {entry.typeLabel} · {entry.description} · {entry.date.slice(0, 10)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={entry.statusLabel} tone={entry.statusTone} />
                <StatusBadge label={formatAccountingAmount(entry.taxableAmount)} tone="primary" />
              </div>
            </div>
            {entry.statusLabel === "Utkast" ? (
              <Button type="button" variant="secondary" disabled={isPending} onClick={() => approveEntry(entry.id)}>
                {isPending ? "Sparar..." : "Godkann forman"}
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
