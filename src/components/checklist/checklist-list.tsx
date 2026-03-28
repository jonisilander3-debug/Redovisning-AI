"use client";

import { ChecklistItemStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getChecklistProgress,
  getChecklistStatusLabel,
  getChecklistStatusTone,
} from "@/lib/checklist-management";
import { cn } from "@/lib/utils";

type ChecklistListProps = {
  companySlug: string;
  projectId: string;
  taskId: string;
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    status: ChecklistItemStatus;
    sortOrder: number;
    sourceLabel?: string | null;
    assignedUser: {
      id: string;
      name: string;
    } | null;
  }>;
  canManage: boolean;
  canToggle: boolean;
};

export function ChecklistList({
  companySlug,
  projectId,
  taskId,
  items,
  canManage,
  canToggle,
}: ChecklistListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const progress = getChecklistProgress(items);

  function updateStatus(itemId: string, status: ChecklistItemStatus) {
    setError(null);
    setPendingId(itemId);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update that checklist step.");
        setPendingId(null);
        return;
      }

      setPendingId(null);
      router.refresh();
    });
  }

  function removeItem(itemId: string) {
    setError(null);
    setPendingId(itemId);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`,
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not remove that checklist step.");
        setPendingId(null);
        return;
      }

      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-[24px] border border-[var(--color-border)] bg-white p-4 sm:p-5">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Checklist progress
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {progress.completed} of {progress.total} steps complete
            </p>
          </div>
          <StatusBadge
            label={`${progress.percentage}% complete`}
            tone={progress.percentage === 100 ? "success" : "accent"}
          />
        </div>
        <div className="h-2.5 rounded-full bg-[var(--color-surface)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
          No checklist steps yet. Add a few simple steps to make the work easier to follow in the field.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const done = item.status === "DONE";
            const busy = isPending && pendingId === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-[20px] border p-4 transition-colors",
                  done
                    ? "border-[var(--color-success-soft)] bg-[var(--color-success-soft)]/55"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        canToggle
                          ? updateStatus(item.id, done ? "TODO" : "DONE")
                          : undefined
                      }
                      disabled={!canToggle || busy}
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                        done
                          ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
                          : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]",
                        !canToggle ? "cursor-default" : "hover:border-[var(--color-primary)]",
                      )}
                      aria-label={done ? "Mark step as not done" : "Mark step as done"}
                    >
                      {done ? "✓" : ""}
                    </button>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "font-semibold text-[var(--color-foreground)]",
                            done ? "line-through opacity-70" : "",
                          )}
                        >
                          {item.title}
                        </p>
                        <StatusBadge
                          label={getChecklistStatusLabel(item.status)}
                          tone={getChecklistStatusTone(item.status)}
                        />
                      </div>
                      <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                        {item.description || "No extra note added for this step."}
                      </p>
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                        {item.assignedUser
                          ? `Assigned to ${item.assignedUser.name}`
                          : "Open to anyone on this project"}
                      </p>
                      {item.sourceLabel ? (
                        <p className="text-xs font-medium text-[var(--color-primary)]">
                          {item.sourceLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="self-start"
                      onClick={() => removeItem(item.id)}
                      disabled={busy}
                    >
                      {busy ? "Removing..." : "Remove"}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error ? (
        <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
