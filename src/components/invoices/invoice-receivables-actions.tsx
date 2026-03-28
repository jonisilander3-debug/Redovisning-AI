"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type InvoiceReceivablesActionsProps = {
  companySlug: string;
  invoiceId: string;
  remainingAmount: string;
};

export function InvoiceReceivablesActions({
  companySlug,
  invoiceId,
  remainingAmount,
}: InvoiceReceivablesActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createCreditNote() {
    setError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/invoices/${invoiceId}/credit-note`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const data = (await response.json()) as { message?: string; invoiceId?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not create a credit note.");
        return;
      }

      if (data.invoiceId) {
        router.push(`/workspace/${companySlug}/invoices/${data.invoiceId}`);
        return;
      }

      router.refresh();
    });
  }

  function handleWriteOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/invoices/${invoiceId}/write-off`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: String(formData.get("date") ?? ""),
            amount: Number(formData.get("amount") ?? 0),
            reason: String(formData.get("reason") ?? ""),
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not write off this invoice.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-[22px] bg-[var(--color-surface)] p-5">
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Receivables actions
        </p>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          Credit notes and write-offs
        </h3>
      </div>

      <Button type="button" variant="secondary" disabled={isPending} onClick={createCreditNote}>
        {isPending ? "Saving..." : "Create credit note"}
      </Button>

      <form className="space-y-4" onSubmit={handleWriteOff}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Write-off date" name="date" type="date" required />
          <TextField
            label="Amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={remainingAmount}
            required
          />
        </div>
        <TextAreaField
          label="Reason"
          name="reason"
          placeholder="Short reason for the write-off"
        />
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Write off remaining receivable"}
        </Button>
      </form>
    </div>
  );
}
