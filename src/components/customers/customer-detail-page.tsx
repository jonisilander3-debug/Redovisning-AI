import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, getInvoiceStatusLabel, getInvoiceStatusTone } from "@/lib/invoicing";
import { formatDateLabel } from "@/lib/time-tracking";

type CustomerDetailPageProps = {
  companySlug: string;
  customer: {
    id: string;
    name: string;
    organizationNumber: string | null;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    postalCode: string | null;
    city: string | null;
    totalQuoted: string;
    totalBilled: string;
    totalPaid: string;
    outstanding: string;
    overdue: string;
    quotes: Array<{
      id: string;
      quoteNumber: string;
      title: string;
      statusLabel: string;
      statusTone: "default" | "primary" | "accent" | "success" | "danger";
      totalGross: string;
      projectId: string | null;
    }>;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      issueDate: Date;
      dueDate: Date;
      status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
      totalGross: string;
      paidAmount: string;
      remainingAmount: string;
      isOverdue: boolean;
      projectTitle: string | null;
    }>;
  };
};

export function CustomerDetailPage({ companySlug, customer }: CustomerDetailPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Kundöversikt"
        title={customer.name}
        description={customer.contactPerson || customer.email || customer.phone || "Ingen kontaktuppgift sparad ännu."}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Offererat</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(customer.totalQuoted)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturerat</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(customer.totalBilled)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Betalt</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{formatCurrency(customer.totalPaid)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Utestående</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(customer.outstanding)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Förfallet</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{formatCurrency(customer.overdue)}</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Kundkort</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">Kontakt och kommersiell status</h2>
          </div>
          <div className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
            <p>Organisationsnummer: {customer.organizationNumber || "Inte satt"}</p>
            <p>Kontaktperson: {customer.contactPerson || "Inte satt"}</p>
            <p>E-post: {customer.email || "Inte satt"}</p>
            <p>Telefon: {customer.phone || "Inte satt"}</p>
            <p>Adress: {[customer.addressLine1, customer.postalCode, customer.city].filter(Boolean).join(", ") || "Inte satt"}</p>
          </div>

          <div className="space-y-3 rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Offerter och order</p>
            {customer.quotes.length > 0 ? (
              customer.quotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between gap-3 rounded-[16px] bg-white px-4 py-3">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{quote.quoteNumber}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{quote.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={quote.statusLabel} tone={quote.statusTone} />
                    {quote.projectId ? (
                      <Link href={`/workspace/${companySlug}/projects/${quote.projectId}`} className="text-sm font-semibold text-[var(--color-primary)]">
                        Projekt
                      </Link>
                    ) : (
                      <Link href={`/workspace/${companySlug}/quotes/${quote.id}`} className="text-sm font-semibold text-[var(--color-primary)]">
                        Öppna
                      </Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">Inga offerter registrerade ännu.</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturor</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">Alla fakturor för kunden</h2>
          </div>
          <div className="space-y-3">
            {customer.invoices.map((invoice) => (
              <Link key={invoice.id} href={`/workspace/${companySlug}/invoices/${invoice.id}`} className="block rounded-[20px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{invoice.projectTitle ?? "Utan projektnamn"}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      Fakturadatum {formatDateLabel(invoice.issueDate)} · Förfallodatum {formatDateLabel(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={invoice.isOverdue ? "Förfallen" : getInvoiceStatusLabel(invoice.status)}
                      tone={invoice.isOverdue ? "danger" : getInvoiceStatusTone(invoice.status)}
                    />
                    <StatusBadge label={formatCurrency(invoice.remainingAmount)} tone={invoice.isOverdue ? "danger" : "primary"} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
