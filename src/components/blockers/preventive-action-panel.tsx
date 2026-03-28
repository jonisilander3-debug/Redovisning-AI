"use client";

import { PreventiveActionStatus, UserRole } from "@prisma/client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { canManageProjects } from "@/lib/access";
import {
  getPreventiveActionStatusLabel,
  getPreventiveActionStatusTone,
} from "@/lib/recurrence-prevention";

type PreventiveActionPanelProps = {
  companySlug: string;
  projectId: string;
  taskId?: string | null;
  blockerId?: string | null;
  viewerRole: UserRole;
  title?: string;
  description?: string;
  ownerOptions?: Array<{
    label: string;
    value: string;
  }>;
  actions: Array<{
    id: string;
    title: string;
    description: string;
    status: PreventiveActionStatus;
    dueDate: string | null;
    owner: {
      id: string;
      name: string;
    } | null;
    sourceBlockerTitle?: string | null;
  }>;
};

export function PreventiveActionPanel({
  companySlug,
  projectId,
  taskId,
  blockerId,
  viewerRole,
  title = "Prevent this from happening again",
  description = "Turn repeated blockers into clear preventive actions and simple guidance for the team.",
  ownerOptions = [],
  actions,
}: PreventiveActionPanelProps) {
  const router = useRouter();
  const canManage = canManageProjects(viewerRole);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/preventive-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          relatedTaskId: taskId || "",
          sourceBlockerId: blockerId || "",
          ownerId: String(formData.get("ownerId") ?? ""),
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          status: String(formData.get("status") ?? "PROPOSED"),
          dueDate: String(formData.get("dueDate") ?? ""),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save that preventive action.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    setError(null);
    setSavingId(id);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/preventive-actions/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            relatedTaskId: taskId || "",
            sourceBlockerId: blockerId || "",
            ownerId: String(formData.get(`ownerId-${id}`) ?? ""),
            title: String(formData.get(`title-${id}`) ?? ""),
            description: String(formData.get(`description-${id}`) ?? ""),
            status: String(formData.get(`status-${id}`) ?? "PROPOSED"),
            dueDate: String(formData.get(`dueDate-${id}`) ?? ""),
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update that preventive action.");
        setSavingId(null);
        return;
      }

      setSavingId(null);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Prevention
        </p>
        <h4 className="text-lg font-semibold text-[var(--color-foreground)]">
          {title}
        </h4>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>

      <div className="space-y-3">
        {actions.length > 0 ? (
          actions.map((action) => (
            <div key={action.id} className="rounded-[20px] bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {action.title}
                  </p>
                  <StatusBadge
                    label={getPreventiveActionStatusLabel(action.status)}
                    tone={getPreventiveActionStatusTone(action.status)}
                  />
                  {action.dueDate ? (
                    <StatusBadge label={`Due ${action.dueDate}`} tone="accent" />
                  ) : null}
                </div>
                {action.owner ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Owner: {action.owner.name}
                  </p>
                ) : null}
              </div>

              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                {action.description}
              </p>

              {action.sourceBlockerTitle ? (
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  Learned from: {action.sourceBlockerTitle}
                </p>
              ) : null}

              {canManage ? (
                <form
                  className="mt-4 grid gap-3 lg:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleUpdate(action.id, new FormData(event.currentTarget));
                  }}
                >
                  <TextField
                    label="Title"
                    name={`title-${action.id}`}
                    defaultValue={action.title}
                  />
                  <SelectField
                    label="Status"
                    name={`status-${action.id}`}
                    defaultValue={action.status}
                    options={[
                      { label: "Proposed", value: "PROPOSED" },
                      { label: "Active", value: "ACTIVE" },
                      { label: "Done", value: "DONE" },
                    ]}
                  />
                  <TextAreaField
                    label="What should change?"
                    name={`description-${action.id}`}
                    defaultValue={action.description}
                    className="lg:col-span-2"
                  />
                  <SelectField
                    label="Owner"
                    name={`ownerId-${action.id}`}
                    defaultValue={action.owner?.id ?? ""}
                    options={[{ label: "No owner yet", value: "" }, ...ownerOptions]}
                  />
                  <TextField
                    label="Due date"
                    name={`dueDate-${action.id}`}
                    type="date"
                    defaultValue={action.dueDate ?? ""}
                  />
                  <div className="lg:col-span-2">
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={isPending && savingId === action.id}
                    >
                      {isPending && savingId === action.id ? "Saving..." : "Save preventive action"}
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[20px] bg-white px-4 py-5 text-sm leading-6 text-[var(--color-muted-foreground)]">
            No preventive guidance has been added here yet.
          </div>
        )}
      </div>

      {canManage ? (
        <form className="space-y-4" onSubmit={handleCreate}>
          <TextField
            label="Preventive action"
            name="title"
            placeholder="Add a checklist step before equipment leaves the shop"
            required
          />
          <TextAreaField
            label="How should the team prevent this next time?"
            name="description"
            placeholder="Describe the process change, checklist improvement, or task guidance that should reduce recurrence."
            required
          />
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Status"
              name="status"
              defaultValue="PROPOSED"
              options={[
                { label: "Proposed", value: "PROPOSED" },
                { label: "Active", value: "ACTIVE" },
                { label: "Done", value: "DONE" },
              ]}
            />
            <SelectField
              label="Owner"
              name="ownerId"
              defaultValue=""
              options={[{ label: "No owner yet", value: "" }, ...ownerOptions]}
            />
            <TextField label="Due date" name="dueDate" type="date" />
          </div>

          {error ? (
            <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={isPending && !savingId}>
            {isPending && !savingId ? "Saving..." : "Add preventive action"}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
