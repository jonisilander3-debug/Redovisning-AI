"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type AbsencePageProps = {
  companySlug: string;
  members: Array<{ label: string; value: string }>;
  entries: Array<{
    id: string;
    userName: string;
    typeLabel: string;
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    startDate: string;
    endDate: string;
    quantityDays: string | null;
    quantityHours: string | null;
    note: string | null;
  }>;
};

export function AbsencePage({ companySlug, members, entries }: AbsencePageProps) {
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
      const response = await fetch(`/api/workspace/${companySlug}/absence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: String(formData.get("userId") ?? ""),
          type: String(formData.get("type") ?? ""),
          startDate: String(formData.get("startDate") ?? ""),
          endDate: String(formData.get("endDate") ?? ""),
          quantityDays: String(formData.get("quantityDays") ?? "")
            ? Number(formData.get("quantityDays"))
            : undefined,
          quantityHours: String(formData.get("quantityHours") ?? "")
            ? Number(formData.get("quantityHours"))
            : undefined,
          note: String(formData.get("note") ?? ""),
          status: String(formData.get("status") ?? "DRAFT"),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save that absence entry.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  function approveEntry(absenceEntryId: string) {
    setActionError(null);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/absence/${absenceEntryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setActionError(data.message ?? "We could not approve that absence entry.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Franvaro"
        title="Track absence and leave for payroll"
        description="Keep approved absence visible before payroll is created so deductions and informational adjustments stay traceable."
      />

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">New absence entry</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Add absence for an employee
          </h2>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="Employee" name="userId" options={members} required />
            <SelectField
              label="Type"
              name="type"
              options={[
                { label: "Sjuk", value: "SICK" },
                { label: "Semester", value: "VACATION" },
                { label: "VAB", value: "VAB" },
                { label: "Tjanstledig utan lon", value: "UNPAID_LEAVE" },
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
            <TextField label="Start date" name="startDate" type="date" required />
            <TextField label="End date" name="endDate" type="date" required />
            <TextField label="Days" name="quantityDays" type="number" min="0" step="0.5" />
            <TextField label="Hours" name="quantityHours" type="number" min="0" step="0.25" />
          </div>
          <TextAreaField label="Note" name="note" placeholder="Optional internal note" />
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save absence"}
          </Button>
        </form>
      </Card>

      {actionError ? <p className="text-sm text-[var(--color-danger)]">{actionError}</p> : null}

      {entries.length === 0 ? (
        <EmptyState
          title="No absence entries yet"
          description="Approved sick leave, VAB, unpaid leave, and vacation will start affecting payroll visibility here."
        />
      ) : null}

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">{entry.userName}</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {entry.typeLabel} · {entry.startDate.slice(0, 10)}-{entry.endDate.slice(0, 10)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={entry.statusLabel} tone={entry.statusTone} />
                {entry.quantityDays ? <StatusBadge label={`${entry.quantityDays} dagar`} tone="primary" /> : null}
                {entry.quantityHours ? <StatusBadge label={`${entry.quantityHours} timmar`} tone="primary" /> : null}
              </div>
            </div>
            {entry.note ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">{entry.note}</p>
            ) : null}
            {entry.statusLabel === "Utkast" ? (
              <Button type="button" variant="secondary" disabled={isPending} onClick={() => approveEntry(entry.id)}>
                {isPending ? "Saving..." : "Approve"}
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
