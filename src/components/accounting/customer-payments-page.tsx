"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { formatAccountingAmount } from "@/lib/accounting";
import { formatDateLabel } from "@/lib/time-tracking";

type CustomerPaymentsPageProps = {
  companySlug: string;
  payments: Array<{
    id: string;
    date: Date;
    amount: string;
    reference: string | null;
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    invoiceNumber: string | null;
    customerName: string | null;
  }>;
};

export function CustomerPaymentsPage({ companySlug, payments }: CustomerPaymentsPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/customer-payments/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: String(formData.get("csv") ?? ""),
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Betalningsimporten misslyckades.");
        return;
      }

      (event.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Kundbetalningar"
        title="See matched and unmatched incoming payments"
        description="Track how customer payments settle invoices and which payments still need manual attention."
      />

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Bank import</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Importera kundinbetalningar fran bankfil
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Klistra in CSV med kolumnerna <code>date,amount,reference</code>. Importen sparar betalningar som omatchade bankposter.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleImport}>
          <TextAreaField label="CSV data" name="csv" placeholder={"date,amount,reference\n2026-03-28,12500.00,INV-2026-0004"} />
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={isPending}>{isPending ? "Importerar..." : "Importera bankbetalningar"}</Button>
        </form>
      </Card>

      {payments.length === 0 ? (
        <EmptyState
          title="No customer payments yet"
          description="Register payments from invoice detail and they will appear here with matching status and accounting traceability."
        />
      ) : null}

      <div className="space-y-3">
        {payments.map((payment) => (
          <Card key={payment.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">
                  {payment.invoiceNumber ?? "Unmatched payment"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {payment.customerName ?? "No invoice linked"} · {formatDateLabel(payment.date)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={payment.statusLabel} tone={payment.statusTone} />
                <StatusBadge label={formatAccountingAmount(payment.amount)} tone="primary" />
              </div>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Referens: {payment.reference ?? "Ingen referens"}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
