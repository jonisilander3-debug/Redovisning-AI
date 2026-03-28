"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import {
  getExecutionImprovementStatusLabel,
  getExecutionImprovementStatusTone,
  getExecutionImprovementTargetLabel,
} from "@/lib/execution-improvements";

type ExecutionImprovementPanelProps = {
  companySlug: string;
  projectOptions: Array<{ label: string; value: string }>;
  preventiveActionOptions: Array<{ label: string; value: string }>;
  improvements: Array<{
    id: string;
    title: string;
    description: string;
    status: "PROPOSED" | "APPLIED" | "ARCHIVED";
    targetType: "TASK_GUIDANCE" | "CHECKLIST_ITEM";
    appliesToFutureTasks: boolean;
    projectTitle: string | null;
    sourcePreventiveActionTitle: string | null;
  }>;
};

export function ExecutionImprovementPanel({
  companySlug,
  projectOptions,
  preventiveActionOptions,
  improvements,
}: ExecutionImprovementPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/execution-improvements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: String(formData.get("projectId") ?? ""),
          sourcePreventiveActionId: String(formData.get("sourcePreventiveActionId") ?? ""),
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          targetType: String(formData.get("targetType") ?? "CHECKLIST_ITEM"),
          status: String(formData.get("status") ?? "PROPOSED"),
          appliesToFutureTasks: formData.get("appliesToFutureTasks") === "on",
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not create that improvement.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Execution improvements
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
          Apply prevention to future work
        </h2>
      </div>

      <form className="space-y-4" onSubmit={handleCreate}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Project scope"
            name="projectId"
            defaultValue=""
            options={[{ label: "Company-wide", value: "" }, ...projectOptions]}
          />
          <SelectField
            label="From preventive action"
            name="sourcePreventiveActionId"
            defaultValue=""
            options={[{ label: "No linked action", value: "" }, ...preventiveActionOptions]}
          />
        </div>
        <TextField label="Improvement title" name="title" placeholder="Add final tool check before departure" required />
        <TextAreaField
          label="What should change?"
          name="description"
          placeholder="Describe the reusable checklist or guidance change future tasks should inherit."
          required
        />
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Apply as"
            name="targetType"
            defaultValue="CHECKLIST_ITEM"
            options={[
              { label: "Checklist item", value: "CHECKLIST_ITEM" },
              { label: "Task guidance", value: "TASK_GUIDANCE" },
            ]}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue="PROPOSED"
            options={[
              { label: "Proposed", value: "PROPOSED" },
              { label: "Applied", value: "APPLIED" },
              { label: "Archived", value: "ARCHIVED" },
            ]}
          />
          <label className="flex items-center gap-3 rounded-[20px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-foreground)]">
            <input type="checkbox" name="appliesToFutureTasks" defaultChecked />
            Apply to future tasks
          </label>
        </div>

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Create improvement"}
        </Button>
      </form>

      <div className="space-y-3">
        {improvements.map((improvement) => (
          <div key={improvement.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-[var(--color-foreground)]">{improvement.title}</p>
              <StatusBadge
                label={getExecutionImprovementTargetLabel(improvement.targetType)}
                tone="primary"
              />
              <StatusBadge
                label={getExecutionImprovementStatusLabel(improvement.status)}
                tone={getExecutionImprovementStatusTone(improvement.status)}
              />
              {improvement.appliesToFutureTasks ? (
                <StatusBadge label="Future tasks" tone="accent" />
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {improvement.description}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {improvement.projectTitle || "Company-wide"}
            </p>
            {improvement.sourcePreventiveActionTitle ? (
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                From prevention: {improvement.sourcePreventiveActionTitle}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
