"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { formatCurrency } from "@/lib/invoicing";

type CustomerRecord = {
  id: string;
  name: string;
  organizationNumber: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  invoiceTermsDays: number | null;
  defaultHourlyRate: string | null;
  outstandingAmount: string;
  overdueInvoiceCount: number;
  projectCount: number;
};

type CustomersPageProps = {
  companySlug: string;
  customers: CustomerRecord[];
};

export function CustomersPage({ companySlug, customers }: CustomersPageProps) {
  const router = useRouter();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customers[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      organizationNumber: String(formData.get("organizationNumber") ?? ""),
      contactPerson: String(formData.get("contactPerson") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      city: String(formData.get("city") ?? ""),
      invoiceTermsDays: formData.get("invoiceTermsDays") ? Number(formData.get("invoiceTermsDays")) : undefined,
      defaultHourlyRate: formData.get("defaultHourlyRate") ? Number(formData.get("defaultHourlyRate")) : undefined,
    };

    const endpoint = selectedCustomer ? `/api/workspace/${companySlug}/customers/${selectedCustomer.id}` : `/api/workspace/${companySlug}/customers`;
    const method = selectedCustomer ? "PATCH" : "POST";

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Vi kunde inte spara kunden.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Kunder"
        title="Bygg upp riktiga kundkort for fakturering"
        description="Koppla projekt och fakturor till sparade kunder sa att villkor, kontaktuppgifter och kundfordringar blir tydligare."
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {customers.length === 0 ? (
            <EmptyState
              title="Inga kunder an"
              description="Skapa den forsta kunden sa att projekt och fakturering kan fa en starkare kundkoppling."
            />
          ) : null}

          {customers.map((customer) => (
            <div key={customer.id} className="block w-full text-left">
              <Card className={`space-y-4 transition-colors ${selectedCustomerId === customer.id ? "ring-2 ring-[var(--color-primary)]" : ""}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{customer.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {customer.organizationNumber || "Org.nr ej satt"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {customer.contactPerson || customer.email || customer.phone || "Ingen kontaktuppgift satt"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Utestaende</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">{formatCurrency(customer.outstandingAmount)}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Projekt</p>
                    <p className="mt-1 text-sm text-[var(--color-foreground)]">{customer.projectCount}</p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Forfallna</p>
                    <p className="mt-1 text-sm text-[var(--color-foreground)]">{customer.overdueInvoiceCount}</p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">Fakturavillkor</p>
                    <p className="mt-1 text-sm text-[var(--color-foreground)]">{customer.invoiceTermsDays ? `${customer.invoiceTermsDays} dagar` : "Inte satt"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button type="button" variant="secondary" onClick={() => setSelectedCustomerId(customer.id)}>
                    Välj i redigering
                  </Button>
                  <Link
                    href={`/workspace/${companySlug}/customers/${customer.id}`}
                    className="text-sm font-semibold text-[var(--color-primary)]"
                  >
                    Öppna kundöversikt
                  </Link>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {selectedCustomer ? "Redigera kund" : "Ny kund"}
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              {selectedCustomer ? selectedCustomer.name : "Skapa kundkort"}
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <TextField label="Kundnamn" name="name" defaultValue={selectedCustomer?.name ?? ""} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Organisationsnummer" name="organizationNumber" defaultValue={selectedCustomer?.organizationNumber ?? ""} />
              <TextField label="Kontaktperson" name="contactPerson" defaultValue={selectedCustomer?.contactPerson ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="E-post" name="email" type="email" defaultValue={selectedCustomer?.email ?? ""} />
              <TextField label="Telefon" name="phone" defaultValue={selectedCustomer?.phone ?? ""} />
            </div>
            <TextField label="Adress" name="addressLine1" defaultValue={selectedCustomer?.addressLine1 ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Postnummer" name="postalCode" defaultValue={selectedCustomer?.postalCode ?? ""} />
              <TextField label="Ort" name="city" defaultValue={selectedCustomer?.city ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Fakturavillkor (dagar)" name="invoiceTermsDays" type="number" defaultValue={selectedCustomer?.invoiceTermsDays ?? ""} />
              <TextField label="Standard timpris" name="defaultHourlyRate" type="number" step="0.01" defaultValue={selectedCustomer?.defaultHourlyRate ?? ""} />
            </div>
            {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sparar..." : selectedCustomer ? "Spara kund" : "Skapa kund"}
              </Button>
              {selectedCustomer ? (
                <Button type="button" variant="secondary" onClick={() => setSelectedCustomerId(null)}>
                  Ny kund
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
