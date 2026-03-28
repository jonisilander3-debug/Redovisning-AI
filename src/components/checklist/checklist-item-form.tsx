"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type ChecklistItemFormProps = {
  companySlug: string;
  projectId: string;
  taskId: string;
  itemId?: string;
  mode: "create" | "edit";
  title: string;
  description: string;
  submitLabel: string;
  statusOptions: Array<{ label: string; value: string }>;
  assigneeOptions: Array<{ label: string; value: string }>;
  defaultValues?: {
    title: string;
    description: string;
    status: string;
    sortOrder: number;
    assignedUserId: string;
  };
};

export function ChecklistItemForm({
  companySlug,
  projectId,
  taskId,
  itemId,
  mode,
  title,
  description,
  submitLabel,
  statusOptions,
  assigneeOptions,
  defaultValues,
}: ChecklistItemFormProps) {
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
      status: String(formData.get("status") ?? "TODO"),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      assignedUserId: String(formData.get("assignedUserId") ?? ""),
    };

    const endpoint =
      mode === "create"
        ? `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/checklist`
        : `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`;
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
        setError(data.message ?? "We could not save this checklist item.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card className="space-y-5 border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          {mode === "create" ? "Add checklist step" : "Edit checklist step"}
        </p>
        <h4 className="text-lg font-semibold text-[var(--color-foreground)]">
          {title}
        </h4>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          label="Step title"
          name="title"
          defaultValue={defaultValues?.title}
          placeholder="Confirm access card"
          required
        />
        <TextAreaField
          label="Short note"
          name="description"
          defaultValue={defaultValues?.description}
          placeholder="Helpful detail for the person doing the work"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Status"
            name="status"
            defaultValue={defaultValues?.status ?? "TODO"}
            options={statusOptions}
          />
          <SelectField
            label="Assigned to"
            name="assignedUserId"
            defaultValue={defaultValues?.assignedUserId ?? ""}
            options={assigneeOptions}
          />
          <TextField
            label="Order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={String(defaultValues?.sortOrder ?? 0)}
          />
        </div>

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
