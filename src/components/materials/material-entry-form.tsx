"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type MaterialEntryFormProps = {
  companySlug: string;
  projectId: string;
};

export function MaterialEntryForm({
  companySlug,
  projectId,
}: MaterialEntryFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;

    const formData = new FormData(form);
    const payload = {
      projectId,
      description: String(formData.get("description") ?? ""),
      quantity: Number(formData.get("quantity") ?? 0),
      unitCost: Number(formData.get("unitCost") ?? 0),
      unitPrice: Number(formData.get("unitPrice") ?? 0),
      isBillable: formData.get("isBillable") === "on",
      supplierName: String(formData.get("supplierName") ?? ""),
      vatRate: String(formData.get("vatRate") ?? "")
        ? Number(formData.get("vatRate"))
        : undefined,
      receiptDate: String(formData.get("receiptDate") ?? ""),
      receiptUrl: String(formData.get("receiptUrl") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/materials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save this material.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Materials
        </p>
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
          Add billable material
        </h3>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          Add enough detail to autobook the purchase. If something is still unclear, it will go to review instead.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextAreaField
          label="Description"
          name="description"
          placeholder="Cable, mounting rail, or other material used on this project"
          required
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Quantity"
            name="quantity"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue="1"
            required
          />
          <TextField
            label="Unit cost"
            name="unitCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            required
          />
          <TextField
            label="Unit price"
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Supplier"
            name="supplierName"
            placeholder="Optional, but helpful for autobooking"
          />
          <TextField
            label="VAT rate"
            name="vatRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="25"
          />
          <TextField
            label="Receipt date"
            name="receiptDate"
            type="date"
          />
        </div>
        <TextField
          label="Receipt URL"
          name="receiptUrl"
          placeholder="Optional link for later bookkeeping"
        />
        <label className="flex items-center gap-3 rounded-[20px] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-foreground)]">
          <input
            type="checkbox"
            name="isBillable"
            defaultChecked
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
          />
          Bill this material on the next invoice
        </label>

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <Button className="w-full sm:w-auto" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Add material"}
        </Button>
      </form>
    </Card>
  );
}
