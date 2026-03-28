"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type TaskFormProps = {
  companySlug: string;
  projectId: string;
  taskId?: string;
  mode: "create" | "edit";
  title: string;
  description: string;
  submitLabel: string;
  statusOptions: Array<{ label: string; value: string }>;
  priorityOptions: Array<{ label: string; value: string }>;
  assigneeOptions: Array<{ label: string; value: string }>;
  templateOptions?: Array<{ label: string; value: string }>;
  availableImprovements?: Array<{
    id: string;
    title: string;
    description: string;
    targetLabel: string;
    statusLabel: string;
    sourcePreventiveActionTitle: string | null;
    defaultSelected: boolean;
  }>;
  defaultValues?: {
    title: string;
    description: string;
    status: string;
    priority: string;
    assignedUserId: string;
    plannedStartDate: string;
    plannedEndDate: string;
      dueDate: string;
      selectedImprovementIds?: string[];
  };
};

export function TaskForm({
  companySlug,
  projectId,
  taskId,
  mode,
  title,
  description,
  submitLabel,
  statusOptions,
  priorityOptions,
  assigneeOptions,
  templateOptions = [],
  availableImprovements = [],
  defaultValues,
}: TaskFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      status: String(formData.get("status") ?? ""),
      priority: String(formData.get("priority") ?? ""),
      assignedUserId: String(formData.get("assignedUserId") ?? ""),
      plannedStartDate: String(formData.get("plannedStartDate") ?? ""),
      plannedEndDate: String(formData.get("plannedEndDate") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      templateId: String(formData.get("templateId") ?? ""),
      selectedImprovementIds: formData.getAll("selectedImprovementIds").map(String),
    };

    const endpoint =
      mode === "create"
        ? `/api/workspace/${companySlug}/projects/${projectId}/tasks`
        : `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save this task.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          {mode === "create" ? "Create task" : "Task settings"}
        </p>
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
          {title}
        </h3>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          label="Task title"
          name="title"
          defaultValue={defaultValues?.title}
          placeholder="Prepare kickoff notes"
          required
        />
        <TextAreaField
          label="Description"
          name="description"
          defaultValue={defaultValues?.description}
          placeholder="A short summary of the exact work item"
        />
        {mode === "create" ? (
          <SelectField
            label="Start from template"
            name="templateId"
            defaultValue=""
            options={[{ label: "Start from scratch", value: "" }, ...templateOptions]}
          />
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Status"
            name="status"
            defaultValue={defaultValues?.status ?? "TODO"}
            options={statusOptions}
          />
          <SelectField
            label="Priority"
            name="priority"
            defaultValue={defaultValues?.priority ?? "MEDIUM"}
            options={priorityOptions}
          />
          <SelectField
            label="Assigned to"
            name="assignedUserId"
            defaultValue={defaultValues?.assignedUserId ?? ""}
            options={assigneeOptions}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Planned start"
            name="plannedStartDate"
            type="date"
            defaultValue={defaultValues?.plannedStartDate}
          />
          <TextField
            label="Planned end"
            name="plannedEndDate"
            type="date"
            defaultValue={defaultValues?.plannedEndDate}
          />
          <TextField
            label="Due date"
            name="dueDate"
            type="date"
            defaultValue={defaultValues?.dueDate}
          />
        </div>

        {availableImprovements.length > 0 && mode === "create" ? (
          <div className="space-y-3 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Prevention-based improvements
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Add known guidance or checklist improvements from earlier blockers to this new task.
              </p>
            </div>
            <div className="space-y-3">
              {availableImprovements.map((improvement) => (
                <label
                  key={improvement.id}
                  className="flex gap-3 rounded-[18px] bg-white p-4"
                >
                  <input
                    type="checkbox"
                    name="selectedImprovementIds"
                    value={improvement.id}
                    defaultChecked={
                      defaultValues?.selectedImprovementIds
                        ? defaultValues.selectedImprovementIds.includes(improvement.id)
                        : improvement.defaultSelected
                    }
                    className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                  />
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {improvement.title}
                      </p>
                      <StatusBadge label={improvement.targetLabel} tone="primary" />
                      <StatusBadge label={improvement.statusLabel} tone="accent" />
                    </div>
                    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                      {improvement.description}
                    </p>
                    {improvement.sourcePreventiveActionTitle ? (
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                        From prevention: {improvement.sourcePreventiveActionTitle}
                      </p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <Button className="w-full sm:w-auto" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Card>
  );
}
