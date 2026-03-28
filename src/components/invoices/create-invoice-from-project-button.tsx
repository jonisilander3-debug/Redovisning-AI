"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type CreateInvoiceFromProjectButtonProps = {
  companySlug: string;
  projectId: string;
  disabled?: boolean;
};

export function CreateInvoiceFromProjectButton({
  companySlug,
  projectId,
  disabled = false,
}: CreateInvoiceFromProjectButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const defaultHourlyRateValue = String(formData.get("defaultHourlyRate") ?? "");

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/invoices/from-project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          defaultHourlyRate: defaultHourlyRateValue
            ? Number(defaultHourlyRateValue)
            : undefined,
        }),
      });

      const data = (await response.json()) as { invoiceId?: string; message?: string };

      if (!response.ok || !data.invoiceId) {
        setError(data.message ?? "We could not create an invoice from this project.");
        return;
      }

      router.push(`/workspace/${companySlug}/invoices/${data.invoiceId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <form className="space-y-3" onSubmit={handleCreateInvoice}>
        <TextField
          label="Fallback hourly rate"
          name="defaultHourlyRate"
          type="number"
          min="0"
          step="0.01"
          placeholder="Optional if older billable time has no rate yet"
        />
        <Button type="submit" disabled={disabled || isPending}>
          {isPending ? "Creating invoice..." : "Create invoice from project"}
        </Button>
      </form>
      {error ? (
        <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
