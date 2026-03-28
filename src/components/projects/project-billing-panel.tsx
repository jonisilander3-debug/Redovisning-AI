"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { formatCurrency } from "@/lib/invoicing";

type BillableTimeRow = {
  id: string;
  date: string;
  description: string;
  userName: string;
  hours: string;
  value: string;
};

type BillableMaterialRow = {
  id: string;
  date: string;
  description: string;
  quantity: string;
  value: string;
};

type DraftLine = {
  key: string;
  type: "TIME" | "MATERIAL";
  sourceType: "TIME" | "MATERIAL";
  sourceId: string;
  date: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  totalNet: string;
  totalVat: string;
  totalGross: string;
  remainingQuantity: string;
  sourceLabel: string;
  userName?: string | null;
  traceLabel: string;
};

type PreviewResponse = {
  preview: {
    customerName: string;
    invoiceModeLabel: string;
    issueDate: string;
    dueDate: string;
    totalNet: string;
    totalVat: string;
    totalGross: string;
    sourceCounts: {
      timeEntries: number;
      materialEntries: number;
    };
    suggestion: {
      action: string;
      label: string;
      reason: string;
    };
    lines: DraftLine[];
  };
};

type DraftPayload = {
  projectId: string;
  customerId?: string;
  invoiceMode: string;
  issueDate?: string;
  dueDate?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  defaultHourlyRate?: number;
  selectedTimeEntryIds: string[];
  selectedMaterialEntryIds: string[];
  draftLines?: Array<{
    key: string;
    include: boolean;
    sourceType: "TIME" | "MATERIAL";
    sourceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

type EditableDraftLine = DraftLine & {
  include: boolean;
};

type ProjectBillingPanelProps = {
  companySlug: string;
  projectId: string;
  customerId: string | null;
  customerName: string;
  customerOptions: Array<{ label: string; value: string }>;
  summary: {
    unbilledTimeValue: string;
    unbilledMaterialValue: string;
    totalUnbilledValue: string;
    totalBilledAmount: string;
    totalPaidAmount: string;
    outstandingReceivables: string;
    remainingBillableAmount: string;
    unbilledTimeCount: number;
    unbilledMaterialCount: number;
    overdueInvoiceCount: number;
  };
  commercialOverview?: {
    agreedGross: string;
    billed: string;
    remainingCommercialRoom: string;
  } | null;
  billableTimeRows: BillableTimeRow[];
  billableMaterialRows: BillableMaterialRow[];
};

function money(value: string | number) {
  return Number(value || 0);
}

export function ProjectBillingPanel({
  companySlug,
  projectId,
  customerId,
  customerName,
  customerOptions,
  summary,
  commercialOverview,
  billableTimeRows,
  billableMaterialRows,
}: ProjectBillingPanelProps) {
  const router = useRouter();
  const [invoiceMode, setInvoiceMode] = useState("PROJECT_FINAL");
  const [selectedTimeEntryIds, setSelectedTimeEntryIds] = useState<string[]>([]);
  const [selectedMaterialEntryIds, setSelectedMaterialEntryIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewResponse["preview"] | null>(null);
  const [editableLines, setEditableLines] = useState<EditableDraftLine[]>([]);
  const [draftPayload, setDraftPayload] = useState<DraftPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canPreview = useMemo(() => {
    if (invoiceMode !== "MANUAL_PROGRESS") {
      return true;
    }
    return selectedTimeEntryIds.length > 0 || selectedMaterialEntryIds.length > 0;
  }, [invoiceMode, selectedMaterialEntryIds.length, selectedTimeEntryIds.length]);

  const editedTotals = useMemo(() => {
    return editableLines
      .filter((line) => line.include)
      .reduce(
        (sum, line) => ({
          totalNet: sum.totalNet + money(line.quantity) * money(line.unitPrice),
          totalVat: sum.totalVat + money(line.quantity) * money(line.unitPrice) * (money(line.vatRate) / 100),
          totalGross:
            sum.totalGross + money(line.quantity) * money(line.unitPrice) * (1 + money(line.vatRate) / 100),
        }),
        { totalNet: 0, totalVat: 0, totalGross: 0 },
      );
  }, [editableLines]);

  const groupedEditableLines = useMemo(() => {
    return Object.values(
      editableLines.reduce<Record<string, { key: string; date: string; type: "TIME" | "MATERIAL"; lines: EditableDraftLine[] }>>(
        (groups, line) => {
          const key = `${line.date.slice(0, 10)}:${line.type}`;
          if (!groups[key]) {
            groups[key] = { key, date: line.date, type: line.type, lines: [] };
          }
          groups[key].lines.push(line);
          return groups;
        },
        {},
      ),
    );
  }, [editableLines]);

  function clearPreviewState(nextMode?: string) {
    setPreview(null);
    setEditableLines([]);
    setDraftPayload(null);
    setError(null);

    if (nextMode && nextMode !== "MANUAL_PROGRESS") {
      setSelectedTimeEntryIds([]);
      setSelectedMaterialEntryIds([]);
    }
  }

  function toggleId(value: string, current: string[], setter: (next: string[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function buildPayload(formData: FormData): DraftPayload {
    const selectedCustomerId = String(formData.get("customerId") ?? customerId ?? "").trim();
    const issueDate = String(formData.get("issueDate") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "").trim();
    const billingPeriodStart = String(formData.get("billingPeriodStart") ?? "").trim();
    const billingPeriodEnd = String(formData.get("billingPeriodEnd") ?? "").trim();

    return {
      projectId,
      customerId: selectedCustomerId || undefined,
      invoiceMode,
      issueDate: issueDate || undefined,
      dueDate: dueDate || undefined,
      billingPeriodStart: billingPeriodStart || undefined,
      billingPeriodEnd: billingPeriodEnd || undefined,
      defaultHourlyRate: formData.get("defaultHourlyRate") ? Number(formData.get("defaultHourlyRate")) : undefined,
      selectedTimeEntryIds,
      selectedMaterialEntryIds,
    };
  }

  function getCreatePayload() {
    if (!draftPayload) {
      return null;
    }

    return {
      ...draftPayload,
      draftLines: editableLines.map((line) => ({
        key: line.key,
        include: line.include,
        sourceType: line.sourceType,
        sourceId: line.sourceId,
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      })),
    };
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const payload = buildPayload(new FormData(event.currentTarget));

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/invoice-drafts/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as PreviewResponse & { message?: string };
      if (!response.ok || !data.preview) {
        setError(data.message ?? "Fakturautkastet kunde inte byggas.");
        setPreview(null);
        setEditableLines([]);
        setDraftPayload(null);
        return;
      }

      setPreview(data.preview);
      setEditableLines(data.preview.lines.map((line) => ({ ...line, include: true })));
      setDraftPayload(payload);
    });
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = getCreatePayload();
      if (!payload) {
        setError("Bygg fakturautkastet först innan du skapar fakturan.");
        return;
      }

      const response = await fetch(`/api/workspace/${companySlug}/invoice-drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { invoiceId?: string; message?: string };
      if (!response.ok || !data.invoiceId) {
        setError(data.message ?? "Fakturan kunde inte skapas.");
        return;
      }

      router.push(`/workspace/${companySlug}/invoices/${data.invoiceId}`);
      router.refresh();
    });
  }

  function updateLine(key: string, updates: Partial<EditableDraftLine>) {
    setEditableLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...updates } : line)),
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Ofakturerat arbete</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(summary.unbilledTimeValue)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Ofakturerat material</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(summary.unbilledMaterialValue)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Utestående</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(summary.outstandingReceivables)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Återstår att fakturera</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(summary.remainingBillableAmount)}</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={`${summary.unbilledTimeCount} tidsrader kvar`} tone="primary" />
          <StatusBadge label={`${summary.unbilledMaterialCount} materialrader kvar`} tone="accent" />
          <StatusBadge
            label={`${summary.overdueInvoiceCount} förfallna fakturor`}
            tone={summary.overdueInvoiceCount > 0 ? "danger" : "default"}
          />
        </div>

        <form className="space-y-4" onSubmit={handlePreview}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectField
              label="Fakturaläge"
              name="invoiceMode"
              value={invoiceMode}
              onChange={(event) => {
                setInvoiceMode(event.target.value);
                clearPreviewState(event.target.value);
              }}
              options={[
                { label: "Slutfakturera", value: "PROJECT_FINAL" },
                { label: "Periodfakturering", value: "PERIODIC" },
                { label: "Delfakturera", value: "MANUAL_PROGRESS" },
              ]}
            />
            <SelectField
              label="Kund"
              name="customerId"
              defaultValue={customerId ?? ""}
              options={[{ label: `Behåll projektkund (${customerName})`, value: "" }, ...customerOptions]}
            />
            <TextField label="Reserv timpris" name="defaultHourlyRate" type="number" min="0" step="0.01" />
            <TextField label="Fakturadatum" name="issueDate" type="date" />
            <TextField label="Förfallodatum" name="dueDate" type="date" />
            {invoiceMode === "PERIODIC" ? (
              <>
                <TextField label="Periodstart" name="billingPeriodStart" type="date" required />
                <TextField label="Periodslut" name="billingPeriodEnd" type="date" required />
              </>
            ) : null}
          </div>

          {invoiceMode === "MANUAL_PROGRESS" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3 rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="font-semibold text-[var(--color-foreground)]">Välj tidsrader</p>
                {billableTimeRows.map((row) => (
                  <label key={row.id} className="flex items-start gap-3 rounded-[16px] bg-white p-3">
                    <input
                      type="checkbox"
                      checked={selectedTimeEntryIds.includes(row.id)}
                      onChange={() => {
                        toggleId(row.id, selectedTimeEntryIds, setSelectedTimeEntryIds);
                        clearPreviewState("MANUAL_PROGRESS");
                      }}
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold text-[var(--color-foreground)]">{row.description}</span>
                      <span className="block text-xs text-[var(--color-muted-foreground)]">
                        {row.date.slice(0, 10)} · {row.userName} · {row.hours} h · {formatCurrency(row.value)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="space-y-3 rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="font-semibold text-[var(--color-foreground)]">Välj materialrader</p>
                {billableMaterialRows.map((row) => (
                  <label key={row.id} className="flex items-start gap-3 rounded-[16px] bg-white p-3">
                    <input
                      type="checkbox"
                      checked={selectedMaterialEntryIds.includes(row.id)}
                      onChange={() => {
                        toggleId(row.id, selectedMaterialEntryIds, setSelectedMaterialEntryIds);
                        clearPreviewState("MANUAL_PROGRESS");
                      }}
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold text-[var(--color-foreground)]">{row.description}</span>
                      <span className="block text-xs text-[var(--color-muted-foreground)]">
                        {row.date.slice(0, 10)} · {row.quantity} st · {formatCurrency(row.value)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isPending || !canPreview}>
              {isPending ? "Bygger..." : "Bygg fakturautkast"}
            </Button>
          </div>
        </form>

        {preview ? (
          <form className="space-y-5 rounded-[22px] bg-[var(--color-surface)] p-5" onSubmit={handleCreate}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturautkast</p>
                <h3 className="text-xl font-semibold text-[var(--color-foreground)]">
                  {preview.invoiceModeLabel} · {preview.customerName}
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {preview.sourceCounts.timeEntries} tidsrader och {preview.sourceCounts.materialEntries} materialrader
                </p>
              </div>
              <div className="max-w-md rounded-[18px] bg-white px-4 py-3">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{preview.suggestion.label}</p>
                <p className="mt-1 text-sm text-[var(--color-foreground)]">{preview.suggestion.reason}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] bg-white p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Delsumma</p>
                <p className="font-semibold text-[var(--color-foreground)]">{formatCurrency(editedTotals.totalNet)}</p>
              </div>
              <div className="rounded-[18px] bg-white p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Moms</p>
                <p className="font-semibold text-[var(--color-foreground)]">{formatCurrency(editedTotals.totalVat)}</p>
              </div>
              <div className="rounded-[18px] bg-white p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Totalt</p>
                <p className="font-semibold text-[var(--color-foreground)]">{formatCurrency(editedTotals.totalGross)}</p>
              </div>
            </div>

            {commercialOverview ? (
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[18px] bg-white p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Avtalat värde</p>
                  <p className="font-semibold text-[var(--color-foreground)]">{formatCurrency(commercialOverview.agreedGross)}</p>
                </div>
                <div className="rounded-[18px] bg-white p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Fakturerat hittills</p>
                  <p className="font-semibold text-[var(--color-foreground)]">{formatCurrency(commercialOverview.billed)}</p>
                </div>
                <div className="rounded-[18px] bg-white p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Detta utkast</p>
                  <p className="font-semibold text-[var(--color-foreground)]">{formatCurrency(editedTotals.totalGross)}</p>
                </div>
                <div className="rounded-[18px] bg-white p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Återstår efter utkast</p>
                  <p className={`font-semibold ${Number(commercialOverview.remainingCommercialRoom) - editedTotals.totalGross < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
                    {formatCurrency(Number(commercialOverview.remainingCommercialRoom) - editedTotals.totalGross)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {groupedEditableLines.map((group) => (
                <div key={group.key} className="space-y-3 rounded-[20px] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">{group.date.slice(0, 10)}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {group.type === "TIME" ? "Arbete" : "Material"}
                      </p>
                    </div>
                    <StatusBadge
                      label={group.type === "TIME" ? "Arbete" : "Material"}
                      tone={group.type === "TIME" ? "primary" : "accent"}
                    />
                  </div>

                  <div className="space-y-3">
                    {group.lines.map((line) => (
                      <div key={line.key} className="rounded-[18px] bg-[var(--color-surface)] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={line.include}
                              onChange={(event) => updateLine(line.key, { include: event.target.checked })}
                            />
                            <span className="space-y-1">
                              <span className="block text-sm font-semibold text-[var(--color-foreground)]">{line.traceLabel}</span>
                              <Link
                                href={`/workspace/${companySlug}/projects/${projectId}?sourceType=${line.sourceType}&sourceId=${line.sourceId}`}
                                className="text-xs text-[var(--color-primary)]"
                              >
                                Öppna ursprungsrad
                              </Link>
                            </span>
                          </label>
                          <StatusBadge label={formatCurrency(money(line.quantity) * money(line.unitPrice))} tone="primary" />
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <TextField
                            label="Beskrivning"
                            name={`description-${line.key}`}
                            value={line.description}
                            onChange={(event) => updateLine(line.key, { description: event.target.value })}
                          />
                          <TextField
                            label={line.sourceType === "TIME" ? "Timmar" : "Antal"}
                            name={`quantity-${line.key}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.quantity}
                            onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                          />
                          <TextField
                            label="Á-pris"
                            name={`unitPrice-${line.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                          />
                        </div>
                        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                          Kvar att fakturera på raden: {line.remainingQuantity} {line.sourceType === "TIME" ? "h" : "st"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isPending || editableLines.every((line) => !line.include)}>
                {isPending ? "Skapar..." : "Skapa faktura"}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
