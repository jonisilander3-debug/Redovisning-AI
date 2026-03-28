"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberDisplay } from "@/components/ui/number-display";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";

type MyDayClientProps = {
  companySlug: string;
  isWorking: boolean;
  activeNote: string;
  activeProjectName?: string;
  activeTaskName?: string;
  todayDurationLabel: string;
  currentStatusLabel: string;
  activeSinceLabel?: string;
  assignedProjects: Array<{
    id: string;
    title: string;
    customerName: string;
    tasks: Array<{
      id: string;
      title: string;
    }>;
  }>;
};

export function MyDayClient({
  companySlug,
  isWorking,
  activeNote,
  activeProjectName,
  activeTaskName,
  todayDurationLabel,
  currentStatusLabel,
  activeSinceLabel,
  assignedProjects,
}: MyDayClientProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(assignedProjects[0]?.id ?? "");
  const [taskId, setTaskId] = useState("");
  const [note, setNote] = useState(activeNote);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedProject = assignedProjects.find((project) => project.id === projectId);
  const taskOptions = [
    { value: "", label: "General project work" },
    ...(selectedProject?.tasks.map((task) => ({
      value: task.id,
      label: task.title,
    })) ?? []),
  ];

  function runAction(action: "start" | "stop") {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/time/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note, projectId, taskId }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update your work status.");
        return;
      }

      if (action === "start") {
        setNote("");
      }

      router.refresh();
    });
  }

  return (
    <Card elevated className="space-y-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Current work status
          </p>
          <NumberDisplay
            value={todayDurationLabel}
            size="lg"
            tone={isWorking ? "positive" : "neutral"}
          />
        </div>
        <StatusBadge label={currentStatusLabel} tone={isWorking ? "accent" : "default"} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-foreground)]">
          {isWorking
            ? activeSinceLabel
              ? `Working since ${activeSinceLabel}`
              : "Work is running now"
            : "Ready to begin when you are"}
        </p>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          Keep this lightweight. Add a short note if you want a simple record of
          what you are working on right now.
        </p>
      </div>

      <div className="rounded-[22px] bg-white p-4 shadow-[var(--shadow-card)]">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          {isWorking ? "Current project" : "Choose project"}
        </p>
        {isWorking ? (
          <>
            <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">
              {activeProjectName || "No project selected"}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {activeTaskName || "General project work"}
            </p>
          </>
        ) : assignedProjects.length > 0 ? (
          <div className="mt-3">
            <SelectField
              label="Project"
              name="projectId"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              options={assignedProjects.map((project) => ({
                value: project.id,
                label: `${project.title} · ${project.customerName}`,
              }))}
            />
            <div className="mt-3">
              <SelectField
                label="Task or work item"
                name="taskId"
                value={taskId}
                onChange={(event) => setTaskId(event.target.value)}
                options={taskOptions}
              />
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            No projects are assigned to you yet, so work cannot be started.
          </p>
        )}
      </div>

      <TextAreaField
        label={isWorking ? "Update your note before stopping" : "What are you working on?"}
        name="note"
        placeholder="Client follow-up, delivery work, internal planning..."
        value={note}
        onChange={(event) => setNote(event.target.value)}
        hint="Optional, short, and easy to update."
      />

      {error ? (
        <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <Button
        className="h-14 w-full text-base"
        type="button"
        disabled={isPending || (!isWorking && assignedProjects.length === 0)}
        onClick={() => runAction(isWorking ? "stop" : "start")}
      >
        {isPending
          ? isWorking
            ? "Stopping work..."
            : "Starting work..."
          : isWorking
            ? "Stop Work"
            : "Start Work"}
      </Button>
    </Card>
  );
}
