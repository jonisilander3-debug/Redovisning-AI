"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type InvoiceStatusActionsProps = {
  companySlug: string;
  invoiceId: string;
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
};

export function InvoiceStatusActions({
  companySlug,
  invoiceId,
  status,
}: InvoiceStatusActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus(nextStatus: "SENT" | "CANCELLED") {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update this invoice.");
        return;
      }

      router.refresh();
    });
  }

  if (status === "PAID" || status === "PARTIALLY_PAID" || status === "CANCELLED") {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {status === "DRAFT" ? (
          <Button
            type="button"
            disabled={isPending}
            onClick={() => updateStatus("SENT")}
          >
            {isPending ? "Saving..." : "Mark as sent"}
          </Button>
        ) : null}
        {status === "DRAFT" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => updateStatus("CANCELLED")}
          >
            Cancel invoice
          </Button>
        ) : null}
      </div>
      {error ? (
        <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
