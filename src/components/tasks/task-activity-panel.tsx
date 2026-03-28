"use client";

import { TaskNoteType, UserRole } from "@prisma/client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import {
  getAvailableTaskNoteTypes,
  getTaskNoteTone,
  getTaskNoteTypeLabel,
} from "@/lib/task-notes";

type TaskActivityPanelProps = {
  companySlug: string;
  projectId: string;
  taskId: string;
  viewerRole: UserRole;
  notes: Array<{
    id: string;
    type: TaskNoteType;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
    };
  }>;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TaskActivityPanel({
  companySlug,
  projectId,
  taskId,
  viewerRole,
  notes,
}: TaskActivityPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const noteTypeOptions = [...getAvailableTaskNoteTypes(viewerRole)];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      type: String(formData.get("type") ?? "COMMENT"),
      content: String(formData.get("content") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save that note.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  return (
    <Card className="space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Task activity
        </p>
        <h4 className="text-lg font-semibold text-[var(--color-foreground)]">
          Notes, handoffs, and execution context
        </h4>
      </div>

      <div className="space-y-3">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="rounded-[20px] bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {note.user.name}
                  </p>
                  <StatusBadge
                    label={getTaskNoteTypeLabel(note.type)}
                    tone={getTaskNoteTone(note.type)}
                  />
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatTimestamp(note.createdAt)}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
                {note.content}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] bg-white px-4 py-5 text-sm leading-6 text-[var(--color-muted-foreground)]">
            No task notes yet. Add a short comment or handoff note to keep the work clear.
          </div>
        )}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <SelectField
          label="Add note type"
          name="type"
          options={noteTypeOptions}
          defaultValue="COMMENT"
        />
        <TextAreaField
          label="New note"
          name="content"
          placeholder="Share what is done, what remains, or what the next person should watch for."
          required
        />

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Saving note..." : "Add note"}
        </Button>
      </form>
    </Card>
  );
}
