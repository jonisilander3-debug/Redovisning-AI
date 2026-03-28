"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type InvoicePaymentFormProps = {
  companySlug: string;
  invoiceId: string;
};

export function InvoicePaymentForm({ companySlug, invoiceId }: InvoicePaymentFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/customer-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId,
          date: String(formData.get("date") ?? ""),
          amount: Number(formData.get("amount") ?? 0),
          reference: String(formData.get("reference") ?? ""),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not register that payment.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Payment date" name="date" type="date" required />
        <TextField label="Amount" name="amount" type="number" min="0.01" step="0.01" required />
      </div>
      <TextField label="Reference" name="reference" placeholder="Optional payment reference" />
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Register payment"}
      </Button>
    </form>
  );
}
