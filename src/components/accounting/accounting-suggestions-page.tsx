"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import {
  accountingSuggestionStatusLabels,
  getAccountingSuggestionStatusTone,
} from "@/lib/accounting-suggestions";

type AccountingSuggestionsPageProps = {
  companySlug: string;
  suggestions: Array<{
    id: string;
    sourceType: "MATERIAL" | "PAYROLL" | "MANUAL";
    sourceId: string;
    sourceLabel: string;
    sourceDescription: string;
    suggestedAccountId: string | null;
    suggestedVatRate: string | null;
    suggestedProjectId: string | null;
    confidenceScore: number | null;
    reasoning: string | null;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
  }>;
  accountOptions: Array<{ label: string; value: string }>;
  projectOptions: Array<{ label: string; value: string }>;
};

export function AccountingSuggestionsPage({
  companySlug,
  suggestions,
  accountOptions,
  projectOptions,
}: AccountingSuggestionsPageProps) {
  const router = useRouter();
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  function handleAction(
    suggestionId: string,
    action: "ACCEPT" | "EDIT_AND_POST" | "REJECT",
    formData?: FormData,
  ) {
    setErrorById((current) => ({ ...current, [suggestionId]: null }));

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/accounting/suggestions/${suggestionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            suggestedAccountId: formData ? String(formData.get("suggestedAccountId") ?? "") : "",
            suggestedVatRate: formData
              ? String(formData.get("suggestedVatRate") ?? "")
                ? Number(formData.get("suggestedVatRate"))
                : undefined
              : undefined,
            suggestedProjectId: formData ? String(formData.get("suggestedProjectId") ?? "") : "",
            reasoning: formData ? String(formData.get("reasoning") ?? "") : "",
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorById((current) => ({
          ...current,
          [suggestionId]: data.message ?? "We could not handle this suggestion.",
        }));
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Forslag"
        title="Granska bokforingsforslag"
        description="Hantera underlag dar systemet vill ha ett sista manskligt beslut innan bokforing."
      />

      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className="space-y-4 bg-white p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-[var(--color-foreground)]">
                {suggestion.sourceLabel}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {suggestion.sourceDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={accountingSuggestionStatusLabels[suggestion.status]}
                tone={getAccountingSuggestionStatusTone(suggestion.status)}
              />
              <StatusBadge
                label={
                  suggestion.confidenceScore
                    ? `${Math.round(suggestion.confidenceScore * 100)}% konfidens`
                    : "Ingen konfidens"
                }
                tone="primary"
              />
            </div>
          </div>

          <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Motivering
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
              {suggestion.reasoning || "Ingen motivering sparad an."}
            </p>
          </div>

          {suggestion.status === "PENDING" ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleAction(suggestion.id, "EDIT_AND_POST", new FormData(event.currentTarget));
              }}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField
                  label="Konto"
                  name="suggestedAccountId"
                  defaultValue={suggestion.suggestedAccountId ?? ""}
                  options={[{ label: "Valj konto", value: "" }, ...accountOptions]}
                />
                <SelectField
                  label="Projekt"
                  name="suggestedProjectId"
                  defaultValue={suggestion.suggestedProjectId ?? ""}
                  options={[{ label: "Inget projekt", value: "" }, ...projectOptions]}
                />
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    Momssats
                  </span>
                  <input
                    name="suggestedVatRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue={suggestion.suggestedVatRate ?? ""}
                    className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition-shadow focus:ring-4 focus:ring-[color:rgba(37,99,235,0.14)]"
                  />
                </label>
              </div>

              <TextAreaField
                label="Kommentar"
                name="reasoning"
                defaultValue={suggestion.reasoning ?? ""}
                placeholder="Kort notering om hur forslaget granskades"
              />

              {errorById[suggestion.id] ? (
                <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  {errorById[suggestion.id]}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAction(suggestion.id, "ACCEPT")}
                >
                  Acceptera och bokfor
                </Button>
                <Button type="submit" variant="secondary" disabled={isPending}>
                  Redigera och bokfor
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleAction(suggestion.id, "REJECT")}
                >
                  Avvisa
                </Button>
              </div>
            </form>
          ) : null}
        </Card>
      ))}

      {suggestions.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            Inga forslag att granska
          </p>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            Material och lon som inte kan autobokforas hamnar har for manuell kontroll.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
