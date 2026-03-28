"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuoteForm } from "@/components/quotes/quote-form";
import { formatCurrency } from "@/lib/invoicing";

type QuoteDetailPageProps = {
  companySlug: string;
  customerOptions: Array<{ label: string; value: string }>;
  quote: {
    id: string;
    quoteNumber: string;
    customerId: string;
    customerName: string;
    status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    title: string;
    description: string;
    issueDate: string;
    validUntil: string;
    totalNet: string;
    totalVat: string;
    totalGross: string;
    acceptedAt: string | null;
    projectId: string | null;
    lines: Array<{
      id: string;
      type: "LABOR" | "MATERIAL" | "FIXED" | "OTHER";
      description: string;
      quantity: string;
      unitPrice: string;
      vatRate: string;
      sortOrder: number;
    }>;
  };
  commercialSummary: {
    quotedGross: string;
    billedGross: string;
    paidGross: string;
    outstandingGross: string;
    remainingGross: string;
  };
};

export function QuoteDetailPage({ companySlug, customerOptions, quote, commercialSummary }: QuoteDetailPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function updateStatus(status: QuoteDetailPageProps["quote"]["status"]) {
    startTransition(async () => {
      await fetch(`/api/workspace/${companySlug}/quotes/${quote.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
  }

  async function convertToProject() {
    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/quotes/${quote.id}/convert-project`, {
        method: "POST",
      });
      const data = (await response.json()) as { projectId?: string };
      if (data.projectId) {
        router.push(`/workspace/${companySlug}/projects/${data.projectId}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow={quote.customerName}
        title={`Offert ${quote.quoteNumber}`}
        description={quote.title}
        actions={<StatusBadge label={quote.statusLabel} tone={quote.statusTone} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Avtalat värde</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(commercialSummary.quotedGross)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturerat</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(commercialSummary.billedGross)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Betalt</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{formatCurrency(commercialSummary.paidGross)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Utestående</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(commercialSummary.outstandingGross)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Återstår</p>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">{formatCurrency(commercialSummary.remainingGross)}</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <QuoteForm
          companySlug={companySlug}
          customerOptions={customerOptions}
          mode="edit"
          quoteId={quote.id}
        defaultValues={{
            customerId: quote.customerId,
            title: quote.title,
            description: quote.description,
            issueDate: quote.issueDate,
            validUntil: quote.validUntil,
            status: quote.status,
            lines: quote.lines,
          }}
        />

        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Offertflöde</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">Status och nästa steg</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => updateStatus("SENT")}>
              Markera som skickad
            </Button>
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => updateStatus("ACCEPTED")}>
              Markera som accepterad
            </Button>
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => updateStatus("REJECTED")}>
              Markera som nekad
            </Button>
          </div>

          {quote.status === "ACCEPTED" ? (
            <div className="space-y-3 rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {quote.projectId ? "Projekt är redan skapat från offerten." : "Offerten är accepterad och kan omvandlas till projekt."}
              </p>
              {quote.projectId ? (
                <Button type="button" onClick={() => router.push(`/workspace/${companySlug}/projects/${quote.projectId}`)}>
                  Öppna projekt
                </Button>
              ) : (
                <Button type="button" onClick={convertToProject} disabled={isPending}>
                  Skapa projekt från offert
                </Button>
              )}
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
