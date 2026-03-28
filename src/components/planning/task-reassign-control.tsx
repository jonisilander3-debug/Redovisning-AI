"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";

type TaskReassignControlProps = {
  companySlug: string;
  projectId: string;
  taskId: string;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  eligibleAssignees: Array<{
    id: string;
    name: string;
  }>;
  workloadMap: Record<
    string,
    {
      label: string;
      tone: "default" | "primary" | "accent" | "success" | "danger";
    }
  >;
  compact?: boolean;
};

export function TaskReassignControl({
  companySlug,
  projectId,
  taskId,
  currentAssigneeId,
  currentAssigneeName,
  eligibleAssignees,
  workloadMap,
  compact = false,
}: TaskReassignControlProps) {
  const router = useRouter();
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(currentAssigneeId ?? "");
  const [handoffNote, setHandoffNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedAssignee = useMemo(
    () => eligibleAssignees.find((assignee) => assignee.id === selectedAssigneeId),
    [eligibleAssignees, selectedAssigneeId],
  );

  function handleReassign() {
    setError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/assignee`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedUserId: selectedAssigneeId,
            handoffNote,
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not reassign that task.");
        return;
      }

      setHandoffNote("");
      router.refresh();
    });
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <SelectField
        label={compact ? "Reassign" : "Move this task to"}
        name={`reassign-${taskId}`}
        value={selectedAssigneeId}
        onChange={(event) => setSelectedAssigneeId(event.target.value)}
        options={[
          { label: "Unassigned", value: "" },
          ...eligibleAssignees.map((assignee) => ({
            label: `${assignee.name}${workloadMap[assignee.id] ? ` - ${workloadMap[assignee.id].label}` : ""}`,
            value: assignee.id,
          })),
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          label={
            currentAssigneeName
              ? `${currentAssigneeName}: ${workloadMap[currentAssigneeId ?? ""]?.label ?? "Current"}`
              : "Currently unassigned"
          }
          tone={currentAssigneeId ? workloadMap[currentAssigneeId]?.tone ?? "default" : "default"}
        />
        {selectedAssignee ? (
          <StatusBadge
            label={`${selectedAssignee.name}: ${workloadMap[selectedAssignee.id]?.label ?? "Selected"}`}
            tone={workloadMap[selectedAssignee.id]?.tone ?? "default"}
          />
        ) : null}
        {selectedAssigneeId &&
        currentAssigneeId &&
        workloadMap[selectedAssigneeId]?.label === "Overloaded" &&
        workloadMap[currentAssigneeId]?.label === "Overloaded" ? (
          <StatusBadge label="Both overloaded" tone="danger" />
        ) : null}
      </div>

      <TextAreaField
        label={compact ? "Handoff note" : "Optional handoff note"}
        name={`handoff-${taskId}`}
        value={handoffNote}
        onChange={(event) => setHandoffNote(event.target.value)}
        placeholder="Explain what is done, what remains, or what the next person should pay attention to."
      />

      <Button
        type="button"
        variant="secondary"
        className={compact ? "w-full" : ""}
        disabled={isPending || selectedAssigneeId === (currentAssigneeId ?? "")}
        onClick={handleReassign}
      >
        {isPending ? "Reassigning..." : "Save reassignment"}
      </Button>

      {error ? (
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
