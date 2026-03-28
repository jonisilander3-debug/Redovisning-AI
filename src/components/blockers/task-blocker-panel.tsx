"use client";

import {
  BlockerOutcomeStatus,
  BlockerFollowUpStatus,
  BlockerSeverity,
  BlockerStatus,
  UserRole,
} from "@prisma/client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PreventiveActionPanel } from "@/components/blockers/preventive-action-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import {
  getBlockerFollowUpStatusLabel,
  getBlockerFollowUpStatusTone,
  getBlockerOutcomeStatusLabel,
  getBlockerOutcomeStatusTone,
  getBlockerSeverityLabel,
  getBlockerSeverityTone,
  getBlockerStatusLabel,
  getBlockerStatusTone,
} from "@/lib/blockers";
import { canManageProjects } from "@/lib/access";

type TaskBlockerPanelProps = {
  companySlug: string;
  projectId: string;
  taskId: string;
  viewerRole: UserRole;
  blockers: Array<{
    id: string;
    title: string;
    description: string;
    status: BlockerStatus;
    severity: BlockerSeverity;
    followUpAction: string | null;
    followUpDate: string | null;
    followUpStatus: BlockerFollowUpStatus | null;
    lastFollowUpAt: string | null;
    outcomeStatus: BlockerOutcomeStatus;
    outcomeSummary: string | null;
    verifiedAt: string | null;
    reopenedAt: string | null;
    reopenReason: string | null;
    followUpOwner: {
      id: string;
      name: string;
    } | null;
    verifiedBy: {
      id: string;
      name: string;
    } | null;
    preventiveActions?: Array<{
      id: string;
      title: string;
      description: string;
      status: "PROPOSED" | "ACTIVE" | "DONE";
      dueDate: string | null;
      owner: {
        id: string;
        name: string;
      } | null;
    }>;
    createdAt: string;
    resolvedAt: string | null;
    resolutionNote: string | null;
    user: {
      id: string;
      name: string;
    };
  }>;
  followUpOwnerOptions?: Array<{
    label: string;
    value: string;
  }>;
  preventiveActionOwnerOptions?: Array<{
    label: string;
    value: string;
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

export function TaskBlockerPanel({
  companySlug,
  projectId,
  taskId,
  viewerRole,
  blockers,
  followUpOwnerOptions = [],
  preventiveActionOwnerOptions = [],
}: TaskBlockerPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const canManage = canManageProjects(viewerRole);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/blockers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
            severity: String(formData.get("severity") ?? "MEDIUM"),
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save that blocker.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  function handleResolve(blockerId: string, resolutionNote: string) {
    setResolveError(null);
    setResolvingId(blockerId);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/blockers/${blockerId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "RESOLVED",
            resolutionNote,
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setResolveError(data.message ?? "We could not resolve that blocker.");
        setResolvingId(null);
        return;
      }

      setResolvingId(null);
      router.refresh();
    });
  }

  function handleFollowUpUpdate(blockerId: string, formData: FormData) {
    setResolveError(null);
    setResolvingId(blockerId);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/blockers/${blockerId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            followUpAction: String(formData.get(`followUpAction-${blockerId}`) ?? ""),
            followUpOwnerId: String(formData.get(`followUpOwnerId-${blockerId}`) ?? ""),
            followUpDate: String(formData.get(`followUpDate-${blockerId}`) ?? ""),
            followUpStatus: String(formData.get(`followUpStatus-${blockerId}`) ?? "") || null,
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setResolveError(data.message ?? "We could not update that follow-up.");
        setResolvingId(null);
        return;
      }

      setResolvingId(null);
      router.refresh();
    });
  }

  function handleOutcomeUpdate(blockerId: string, formData: FormData) {
    setResolveError(null);
    setResolvingId(blockerId);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${projectId}/tasks/${taskId}/blockers/${blockerId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outcomeStatus: String(formData.get(`outcomeStatus-${blockerId}`) ?? "UNVERIFIED"),
            outcomeSummary: String(formData.get(`outcomeSummary-${blockerId}`) ?? ""),
            reopenReason: String(formData.get(`reopenReason-${blockerId}`) ?? ""),
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setResolveError(data.message ?? "We could not update that blocker outcome.");
        setResolvingId(null);
        return;
      }

      setResolvingId(null);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Blockers
        </p>
        <h4 className="text-lg font-semibold text-[var(--color-foreground)]">
          Raise issues before work slows down
        </h4>
      </div>

      <div className="space-y-3">
        {blockers.length > 0 ? (
          blockers.map((blocker) => (
            <div key={blocker.id} className="rounded-[20px] bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {blocker.title}
                  </p>
                  <StatusBadge
                    label={getBlockerSeverityLabel(blocker.severity)}
                    tone={getBlockerSeverityTone(blocker.severity)}
                  />
                  <StatusBadge
                    label={getBlockerStatusLabel(blocker.status)}
                    tone={getBlockerStatusTone(blocker.status)}
                  />
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatTimestamp(blocker.createdAt)}
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                Reported by {blocker.user.name}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                {blocker.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge
                  label={getBlockerFollowUpStatusLabel(blocker.followUpStatus)}
                  tone={getBlockerFollowUpStatusTone(blocker.followUpStatus)}
                />
                <StatusBadge
                  label={getBlockerOutcomeStatusLabel(blocker.outcomeStatus)}
                  tone={getBlockerOutcomeStatusTone(blocker.outcomeStatus)}
                />
                {blocker.followUpDate ? (
                  <StatusBadge label={`Follow-up ${blocker.followUpDate}`} tone="primary" />
                ) : null}
                {blocker.followUpOwner ? (
                  <StatusBadge label={`Owner ${blocker.followUpOwner.name}`} tone="accent" />
                ) : null}
              </div>
              {blocker.followUpAction ? (
                <p className="mt-3 text-sm leading-6 text-[var(--color-foreground)]">
                  Next step: {blocker.followUpAction}
                </p>
              ) : null}
              {blocker.resolutionNote ? (
                <p className="mt-3 text-sm leading-6 text-[var(--color-foreground)]">
                  Resolution: {blocker.resolutionNote}
                </p>
              ) : null}
              {blocker.outcomeSummary ? (
                <p className="mt-3 text-sm leading-6 text-[var(--color-foreground)]">
                  Outcome: {blocker.outcomeSummary}
                </p>
              ) : null}
              {blocker.reopenReason ? (
                <p className="mt-3 text-sm leading-6 text-[var(--color-danger)]">
                  Reopen reason: {blocker.reopenReason}
                </p>
              ) : null}
              {blocker.verifiedBy ? (
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  Verified by {blocker.verifiedBy.name}
                  {blocker.verifiedAt ? ` on ${formatTimestamp(blocker.verifiedAt)}` : ""}
                </p>
              ) : null}
              {blocker.reopenedAt ? (
                <p className="mt-2 text-sm text-[var(--color-danger)]">
                  Reopened {formatTimestamp(blocker.reopenedAt)}
                </p>
              ) : null}

              {canManage ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  {blocker.status === "OPEN" ? (
                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleFollowUpUpdate(blocker.id, new FormData(event.currentTarget));
                      }}
                    >
                      <TextField
                        label="Next action"
                        name={`followUpAction-${blocker.id}`}
                        defaultValue={blocker.followUpAction ?? ""}
                        placeholder="What should happen next?"
                      />
                      <SelectField
                        label="Owner"
                        name={`followUpOwnerId-${blocker.id}`}
                        defaultValue={blocker.followUpOwner?.id ?? ""}
                        options={[
                          { label: "No owner yet", value: "" },
                          ...followUpOwnerOptions,
                        ]}
                      />
                      <TextField
                        label="Follow-up date"
                        name={`followUpDate-${blocker.id}`}
                        type="date"
                        defaultValue={blocker.followUpDate ?? ""}
                      />
                      <SelectField
                        label="Follow-up status"
                        name={`followUpStatus-${blocker.id}`}
                        defaultValue={blocker.followUpStatus ?? ""}
                        options={[
                          { label: "Not planned", value: "" },
                          { label: "Pending", value: "PENDING" },
                          { label: "In progress", value: "IN_PROGRESS" },
                          { label: "Done", value: "DONE" },
                        ]}
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={isPending && resolvingId === blocker.id}
                      >
                        {isPending && resolvingId === blocker.id
                          ? "Saving..."
                          : "Save follow-up"}
                      </Button>
                    </form>
                  ) : (
                    <div className="rounded-[20px] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
                      Follow-up planning is complete for this blocker. Use the outcome form to confirm whether the fix held or needs reopening.
                    </div>
                  )}

                  {blocker.status === "OPEN" ? (
                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        handleResolve(
                          blocker.id,
                          String(formData.get(`resolution-${blocker.id}`) ?? ""),
                        );
                      }}
                    >
                      <TextAreaField
                        label="Resolution note"
                        name={`resolution-${blocker.id}`}
                        placeholder="Share what was decided or what changed so the team can move again."
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={isPending && resolvingId === blocker.id}
                      >
                        {isPending && resolvingId === blocker.id
                          ? "Resolving..."
                          : "Mark resolved"}
                      </Button>
                    </form>
                  ) : (
                    <div className="rounded-[20px] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
                      This blocker is currently resolved. If the fix did not hold, use the outcome form to reopen it with a clear reason.
                    </div>
                  )}

                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleOutcomeUpdate(blocker.id, new FormData(event.currentTarget));
                    }}
                  >
                    <SelectField
                      label="Outcome"
                      name={`outcomeStatus-${blocker.id}`}
                      defaultValue={blocker.outcomeStatus}
                      options={[
                        { label: "Unverified", value: "UNVERIFIED" },
                        { label: "Resolved confirmed", value: "RESOLVED_CONFIRMED" },
                        { label: "Partially resolved", value: "RESOLVED_PARTIAL" },
                        { label: "Reopened", value: "REOPENED" },
                      ]}
                    />
                    <TextAreaField
                      label="Outcome summary"
                      name={`outcomeSummary-${blocker.id}`}
                      defaultValue={blocker.outcomeSummary ?? ""}
                      placeholder="Did the fix work fully, partly, or not at all?"
                    />
                    <TextAreaField
                      label="Reopen reason"
                      name={`reopenReason-${blocker.id}`}
                      defaultValue={blocker.reopenReason ?? ""}
                      placeholder="If the blocker is still affecting the work, explain why."
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={isPending && resolvingId === blocker.id}
                    >
                      {isPending && resolvingId === blocker.id
                        ? "Saving outcome..."
                        : "Save outcome"}
                    </Button>
                  </form>
                </div>
              ) : null}

              {!canManage && blocker.status === "RESOLVED" ? (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleOutcomeUpdate(blocker.id, new FormData(event.currentTarget));
                  }}
                >
                  <SelectField
                    label="Still affecting the work?"
                    name={`outcomeStatus-${blocker.id}`}
                    defaultValue="REOPENED"
                    options={[
                      { label: "Still blocked", value: "REOPENED" },
                      { label: "Partly solved", value: "RESOLVED_PARTIAL" },
                    ]}
                  />
                  <TextAreaField
                    label="What is still happening?"
                    name={`outcomeSummary-${blocker.id}`}
                    placeholder="Share what is still affecting the task so the team can act."
                  />
                  <TextAreaField
                    label="Why should this reopen?"
                    name={`reopenReason-${blocker.id}`}
                    placeholder="Explain what still prevents the work from moving."
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={isPending && resolvingId === blocker.id}
                  >
                    {isPending && resolvingId === blocker.id
                      ? "Sending..."
                      : "Report that this is not solved"}
                  </Button>
                </form>
              ) : null}

              {canManage || (blocker.preventiveActions ?? []).length > 0 ? (
                <div className="mt-4">
                  <PreventiveActionPanel
                    companySlug={companySlug}
                    projectId={projectId}
                    taskId={taskId}
                    blockerId={blocker.id}
                    viewerRole={viewerRole}
                    title="Reduce repeated blockers"
                    description="Capture a process change, checklist improvement, or known guidance so the same issue is less likely to come back."
                    ownerOptions={preventiveActionOwnerOptions}
                    actions={(blocker.preventiveActions ?? []).map((action) => ({
                      id: action.id,
                      title: action.title,
                      description: action.description,
                      status: action.status,
                      dueDate: action.dueDate,
                      owner: action.owner,
                      sourceBlockerTitle: blocker.title,
                    }))}
                  />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[20px] bg-white px-4 py-5 text-sm leading-6 text-[var(--color-muted-foreground)]">
            No blockers reported on this task yet.
          </div>
        )}
      </div>

      <form className="space-y-4" onSubmit={handleCreate}>
        <TextField
          label="Blocker title"
          name="title"
          placeholder="What is holding this task back?"
          required
        />
        <TextAreaField
          label="What do you need?"
          name="description"
          placeholder="Explain what is missing, waiting, unclear, or preventing progress."
          required
        />
        <SelectField
          label="Severity"
          name="severity"
          defaultValue="MEDIUM"
          options={[
            { label: "Low", value: "LOW" },
            { label: "Medium", value: "MEDIUM" },
            { label: "High", value: "HIGH" },
          ]}
        />

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        {resolveError ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {resolveError}
          </div>
        ) : null}

        <Button type="submit" disabled={isPending && !resolvingId}>
          {isPending && !resolvingId ? "Reporting..." : "Report blocker"}
        </Button>
      </form>
    </Card>
  );
}
