"use client";

import { ProjectKickoffStatus } from "@prisma/client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import {
  getProjectKickoffLabel,
  getProjectKickoffTone,
  projectKickoffOptions,
} from "@/lib/project-kickoff";

type ProjectKickoffPanelProps = {
  companySlug: string;
  projectId: string;
  canManage: boolean;
  kickoffStatus: ProjectKickoffStatus;
  kickoffNotes: string | null;
  kickoffCompletedAt: string | null;
  kickoffCompletedByName: string | null;
  startDate: string;
  endDate: string;
  assignedUserIds: string[];
  teamMembers: Array<{
    id: string;
    name: string;
    roleLabel: string;
  }>;
  firstTasks: Array<{
    id: string;
    title: string;
    assignedUserName: string | null;
    statusLabel: string;
  }>;
  readiness: {
    isReady: boolean;
    completedCount: number;
    totalCount: number;
    items: Array<{
      key: string;
      label: string;
      complete: boolean;
    }>;
  };
};

export function ProjectKickoffPanel({
  companySlug,
  projectId,
  canManage,
  kickoffStatus,
  kickoffNotes,
  kickoffCompletedAt,
  kickoffCompletedByName,
  startDate,
  endDate,
  assignedUserIds,
  teamMembers,
  firstTasks,
  readiness,
}: ProjectKickoffPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ProjectKickoffStatus>(kickoffStatus);

  function submitKickoff(formData: FormData, nextStatus: ProjectKickoffStatus) {
    setError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/kickoff`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            kickoffStatus: nextStatus,
            kickoffNotes: String(formData.get("kickoffNotes") ?? ""),
            startDate: String(formData.get("startDate") ?? ""),
            endDate: String(formData.get("endDate") ?? ""),
            assignedUserIds: formData.getAll("assignedUserIds").map(String),
            firstTaskIds: formData.getAll("firstTaskIds").map(String),
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save kickoff.");
        return;
      }

      setStatus(nextStatus);
      router.refresh();
    });
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
    nextStatus: ProjectKickoffStatus,
  ) {
    event.preventDefault();
    submitKickoff(new FormData(event.currentTarget), nextStatus);
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Project kickoff
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Start this project cleanly
          </h2>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            Confirm the team, dates, and first work so everyone knows how the project starts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={getProjectKickoffLabel(status)}
            tone={getProjectKickoffTone(status)}
          />
          <StatusBadge
            label={
              readiness.isReady
                ? "Ready to start"
                : `${readiness.completedCount} of ${readiness.totalCount} ready`
            }
            tone={readiness.isReady ? "success" : "accent"}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {readiness.items.map((item) => (
          <div
            key={item.key}
            className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {item.complete ? "Done" : "Missing"}
              </p>
              <StatusBadge
                label={item.complete ? "Ready" : "Needs action"}
                tone={item.complete ? "success" : "accent"}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {kickoffCompletedAt ? (
        <div className="rounded-[20px] bg-[var(--color-success-soft)] px-4 py-4 text-sm text-[var(--color-success)]">
          Kickoff completed
          {kickoffCompletedByName ? ` by ${kickoffCompletedByName}` : ""}
          {` on ${new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date(kickoffCompletedAt))}`}.
        </div>
      ) : null}

      <form
        className="space-y-5"
        onSubmit={(event) => handleSubmit(event, status)}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Kickoff status"
            name="kickoffStatus"
            value={status}
            onChange={(event) => setStatus(event.target.value as ProjectKickoffStatus)}
            options={projectKickoffOptions}
            disabled={!canManage}
          />
          <TextField
            label="Start date"
            name="startDate"
            type="date"
            defaultValue={startDate}
            disabled={!canManage}
          />
          <TextField
            label="End date"
            name="endDate"
            type="date"
            defaultValue={endDate}
            disabled={!canManage}
          />
        </div>

        <TextAreaField
          label="Kickoff notes"
          name="kickoffNotes"
          defaultValue={kickoffNotes ?? ""}
          placeholder="Add short instructions for how this project should begin."
          disabled={!canManage}
        />

        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Confirm the team
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {teamMembers.map((member) => (
              <label
                key={member.id}
                className="flex items-start gap-3 rounded-[22px] bg-[var(--color-surface)] p-4"
              >
                <input
                  type="checkbox"
                  name="assignedUserIds"
                  value={member.id}
                  defaultChecked={assignedUserIds.includes(member.id)}
                  disabled={!canManage}
                  className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-[var(--color-foreground)]">
                    {member.name}
                  </span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    {member.roleLabel}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              First work to focus on
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Choose the first tasks the team should see when this project starts.
            </p>
          </div>
          {firstTasks.length > 0 ? (
            <div className="grid gap-3">
              {firstTasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-start gap-3 rounded-[22px] bg-[var(--color-surface)] p-4"
                >
                  <input
                    type="checkbox"
                    name="firstTaskIds"
                    value={task.id}
                    defaultChecked
                    disabled={!canManage}
                    className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-[var(--color-foreground)]">
                      {task.title}
                    </span>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">
                      {task.assignedUserName
                        ? `${task.assignedUserName} | ${task.statusLabel}`
                        : task.statusLabel}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
              Add at least one active task to complete kickoff cleanly.
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        {canManage ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Saving..." : "Save kickoff progress"}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={(event) => {
                const form = event.currentTarget.form;

                if (!form) {
                  return;
                }

                submitKickoff(new FormData(form), "COMPLETED");
              }}
            >
              {isPending ? "Completing..." : "Complete kickoff"}
            </Button>
          </div>
        ) : (
          <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
            Kickoff details are set by a project manager. You will see the starting tasks and notes here when the project is ready.
          </div>
        )}
      </form>
    </Card>
  );
}
