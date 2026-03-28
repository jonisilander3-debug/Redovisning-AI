"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type QuoteLine = {
  id?: string;
  type: "LABOR" | "MATERIAL" | "FIXED" | "OTHER";
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  sortOrder: number;
};

type QuoteFormProps = {
  companySlug: string;
  customerOptions: Array<{ label: string; value: string }>;
  mode: "create" | "edit";
  quoteId?: string;
  defaultValues?: {
    customerId: string;
    title: string;
    description: string;
    issueDate: string;
    validUntil: string;
    status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
    lines: QuoteLine[];
  };
};

const emptyLine = (sortOrder: number): QuoteLine => ({
  type: "LABOR",
  description: "",
  quantity: "1",
  unitPrice: "0",
  vatRate: "25",
  sortOrder,
});

export function QuoteForm({ companySlug, customerOptions, mode, quoteId, defaultValues }: QuoteFormProps) {
  const router = useRouter();
  const [lines, setLines] = useState<QuoteLine[]>(defaultValues?.lines?.length ? defaultValues.lines : [emptyLine(0)]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateLine(index: number, updates: Partial<QuoteLine>) {
    setLines((current) => current.map((line, currentIndex) => (currentIndex === index ? { ...line, ...updates } : line)));
  }

  function addLine() {
    setLines((current) => [...current, emptyLine(current.length)]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, currentIndex) => currentIndex !== index).map((line, currentIndex) => ({ ...line, sortOrder: currentIndex })));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    const payload = {
      customerId: String(formData.get("customerId") ?? ""),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      issueDate: String(formData.get("issueDate") ?? ""),
      validUntil: String(formData.get("validUntil") ?? ""),
      status: String(formData.get("status") ?? "DRAFT"),
      lines,
    };

    const endpoint = mode === "create" ? `/api/workspace/${companySlug}/quotes` : `/api/workspace/${companySlug}/quotes/${quoteId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string; quoteId?: string };

      if (!response.ok) {
        setError(data.message ?? "Offerten kunde inte sparas.");
        return;
      }

      if (mode === "create" && data.quoteId) {
        router.push(`/workspace/${companySlug}/quotes/${data.quoteId}`);
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card className="space-y-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Kund" name="customerId" defaultValue={defaultValues?.customerId ?? ""} options={customerOptions} />
          <TextField label="Offerttitel" name="title" defaultValue={defaultValues?.title ?? ""} required />
        </div>
        <TextAreaField label="Beskrivning" name="description" defaultValue={defaultValues?.description ?? ""} />
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Offertdatum" name="issueDate" type="date" defaultValue={defaultValues?.issueDate ?? ""} required />
          <TextField label="Giltig till" name="validUntil" type="date" defaultValue={defaultValues?.validUntil ?? ""} />
          <SelectField
            label="Status"
            name="status"
            defaultValue={defaultValues?.status ?? "DRAFT"}
            options={[
              { label: "Offertutkast", value: "DRAFT" },
              { label: "Skickad", value: "SENT" },
              { label: "Accepterad", value: "ACCEPTED" },
              { label: "Nekad", value: "REJECTED" },
              { label: "Förfallen", value: "EXPIRED" },
            ]}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Offertrader</p>
            <Button type="button" variant="secondary" onClick={addLine}>
              Lägg till rad
            </Button>
          </div>
          {lines.map((line, index) => (
            <div key={`${line.id ?? "new"}-${index}`} className="rounded-[20px] bg-[var(--color-surface)] p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-5">
                <SelectField
                  label="Typ"
                  name={`type-${index}`}
                  value={line.type}
                  onChange={(event) => updateLine(index, { type: event.target.value as QuoteLine["type"] })}
                  options={[
                    { label: "Arbete", value: "LABOR" },
                    { label: "Material", value: "MATERIAL" },
                    { label: "Fast pris", value: "FIXED" },
                    { label: "Övrigt", value: "OTHER" },
                  ]}
                />
                <div className="md:col-span-2">
                  <TextField
                    label="Beskrivning"
                    name={`description-${index}`}
                    value={line.description}
                    onChange={(event) => updateLine(index, { description: event.target.value })}
                  />
                </div>
                <TextField
                  label="Antal"
                  name={`quantity-${index}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                />
                <TextField
                  label="Á-pris"
                  name={`unitPrice-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <TextField
                  label="Moms %"
                  name={`vatRate-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.vatRate}
                  onChange={(event) => updateLine(index, { vatRate: event.target.value })}
                />
                {lines.length > 1 ? (
                  <div className="flex items-end">
                    <Button type="button" variant="secondary" onClick={() => removeLine(index)}>
                      Ta bort rad
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Sparar..." : mode === "create" ? "Skapa offert" : "Spara offert"}
        </Button>
      </form>
    </Card>
  );
}
