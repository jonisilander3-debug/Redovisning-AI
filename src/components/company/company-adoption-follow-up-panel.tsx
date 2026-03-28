"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getCompanyAdoptionFollowUpOutcomeStatusLabel,
  getCompanyAdoptionFollowUpOutcomeStatusTone,
  getCompanyAdoptionFollowUpPriorityLabel,
  getCompanyAdoptionFollowUpPriorityTone,
  getCompanyAdoptionFollowUpReviewStatusLabel,
  getCompanyAdoptionFollowUpReviewStatusTone,
  getCompanyAdoptionFollowUpStatusLabel,
  getCompanyAdoptionFollowUpStatusTone,
} from "@/lib/company-adoption-followups";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type Recommendation = {
  label: string;
  tone: "danger" | "accent" | "success";
};

type FollowUp = {
  id: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  dueDate: string | null;
  reviewByDate: string | null;
  lastReviewedAt: string | null;
  lastReviewedByUserId: string | null;
  lastReviewedByName: string | null;
  reviewStatus: "NOT_REVIEWED" | "REVIEWED_RECENTLY" | "REVIEW_NEEDED" | "OVERDUE_REVIEW";
  reviewNote: string | null;
  reviewRecommendation: string;
  outcomeStatus: "UNVERIFIED" | "IMPROVED" | "PARTIAL_IMPROVEMENT" | "NO_PROGRESS" | "REGRESSED";
  outcomeSummary: string | null;
  outcomeRecordedAt: string | null;
  outcomeRecordedByUserId: string | null;
  outcomeRecordedByName: string | null;
  outcomeRecommendation: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  completedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

type OwnerOption = {
  value: string;
  label: string;
};

type CompanyAdoptionFollowUpPanelProps = {
  createPath: string;
  updatePathBase: string;
  companyId: string;
  companyName: string;
  followUps: FollowUp[];
  ownerOptions: OwnerOption[];
  recommendations?: Recommendation[];
  compact?: boolean;
};

const priorityOptions = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
];

const statusOptions = [
  { label: "Open", value: "OPEN" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Done", value: "DONE" },
];

const outcomeOptions = [
  { label: "Unverified", value: "UNVERIFIED" },
  { label: "Improved", value: "IMPROVED" },
  { label: "Partial improvement", value: "PARTIAL_IMPROVEMENT" },
  { label: "No progress", value: "NO_PROGRESS" },
  { label: "Regressed", value: "REGRESSED" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "No date set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function CompanyAdoptionFollowUpPanel({
  createPath,
  updatePathBase,
  companyId,
  companyName,
  followUps,
  ownerOptions,
  recommendations = [],
  compact = false,
}: CompanyAdoptionFollowUpPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftOwnerId, setDraftOwnerId] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [draftReviewByDate, setDraftReviewByDate] = useState("");
  const [draftPriority, setDraftPriority] = useState("MEDIUM");

  const openFollowUps = useMemo(
    () => followUps.filter((followUp) => followUp.status !== "DONE"),
    [followUps],
  );
  const staleReviewFollowUps = useMemo(
    () =>
      followUps.filter(
        (followUp) =>
          followUp.status !== "DONE" &&
          (followUp.reviewStatus === "REVIEW_NEEDED" ||
            followUp.reviewStatus === "OVERDUE_REVIEW" ||
            followUp.reviewStatus === "NOT_REVIEWED"),
      ),
    [followUps],
  );
  const weakOutcomeFollowUps = useMemo(
    () =>
      followUps.filter(
        (followUp) =>
          followUp.outcomeStatus === "NO_PROGRESS" || followUp.outcomeStatus === "REGRESSED",
      ),
    [followUps],
  );

  function resetDraft() {
    setDraftTitle("");
    setDraftDescription("");
    setDraftOwnerId("");
    setDraftDueDate("");
    setDraftReviewByDate("");
    setDraftPriority("MEDIUM");
  }

  function applyRecommendation(recommendation: string) {
    setDraftTitle(recommendation);
    setDraftDescription(`Follow up on "${recommendation.toLowerCase()}" for ${companyName}.`);
    if (recommendation.includes("No ") || recommendation.includes("Resolve")) {
      setDraftPriority("HIGH");
    }
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch(createPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draftTitle,
          description: draftDescription,
          ownerId: draftOwnerId,
          dueDate: draftDueDate,
          reviewByDate: draftReviewByDate,
          reviewNote: "",
          outcomeStatus: "UNVERIFIED",
          outcomeSummary: "",
          priority: draftPriority,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not create the adoption follow-up.");
        return;
      }

      resetDraft();
      router.refresh();
    });
  }

  function handleUpdate(followUpId: string, formData: FormData) {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`${updatePathBase}/${followUpId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: String(formData.get(`title-${followUpId}`) ?? ""),
          description: String(formData.get(`description-${followUpId}`) ?? ""),
          ownerId: String(formData.get(`owner-${followUpId}`) ?? ""),
          dueDate: String(formData.get(`dueDate-${followUpId}`) ?? ""),
          reviewByDate: String(formData.get(`reviewByDate-${followUpId}`) ?? ""),
          reviewNote: String(formData.get(`reviewNote-${followUpId}`) ?? ""),
          markReviewed: formData.get(`markReviewed-${followUpId}`) === "on",
          outcomeStatus: String(formData.get(`outcomeStatus-${followUpId}`) ?? "UNVERIFIED"),
          outcomeSummary: String(formData.get(`outcomeSummary-${followUpId}`) ?? ""),
          markOutcomeRecorded: formData.get(`markOutcomeRecorded-${followUpId}`) === "on",
          status: String(formData.get(`status-${followUpId}`) ?? "OPEN"),
          priority: String(formData.get(`priority-${followUpId}`) ?? "MEDIUM"),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update the follow-up.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          label={
            openFollowUps.length > 0
              ? `${openFollowUps.length} open follow-up${openFollowUps.length === 1 ? "" : "s"}`
              : "No open follow-ups"
          }
          tone={openFollowUps.length > 0 ? "accent" : "default"}
        />
        {followUps.some(
          (followUp) =>
            followUp.status !== "DONE" && followUp.dueDate && new Date(followUp.dueDate) < new Date(),
        ) ? <StatusBadge label="Overdue follow-up" tone="danger" /> : null}
        {staleReviewFollowUps.length > 0 ? (
          <StatusBadge
            label={`${staleReviewFollowUps.length} review${staleReviewFollowUps.length === 1 ? "" : "s"} need attention`}
            tone="danger"
          />
        ) : null}
        {weakOutcomeFollowUps.length > 0 ? (
          <StatusBadge
            label={`${weakOutcomeFollowUps.length} weak outcome${weakOutcomeFollowUps.length === 1 ? "" : "s"}`}
            tone="danger"
          />
        ) : null}
      </div>

      {recommendations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Turn a recommendation into action
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendations.map((recommendation) => (
              <button
                key={`${companyId}-${recommendation.label}`}
                type="button"
                onClick={() => applyRecommendation(recommendation.label)}
                className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-foreground)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Use: {recommendation.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form
        className={`rounded-[18px] bg-white p-4 shadow-[var(--shadow-card)] ${
          compact ? "space-y-3" : "space-y-4"
        }`}
        onSubmit={handleCreate}
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Add follow-up</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Assign the next step so this company does not stay idle or stalled.
          </p>
        </div>
        <TextField
          label="Title"
          name="title"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          placeholder="Create the first project"
          required
        />
        <TextAreaField
          label="Description"
          name="description"
          value={draftDescription}
          onChange={(event) => setDraftDescription(event.target.value)}
          placeholder="Clarify what should happen next and what good progress looks like."
        />
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField
            label="Owner"
            name="ownerId"
            value={draftOwnerId}
            onChange={(event) => setDraftOwnerId(event.target.value)}
            options={[
              { label: "No owner yet", value: "" },
              ...ownerOptions,
            ]}
          />
          <TextField
            label="Due date"
            name="dueDate"
            type="date"
            value={draftDueDate}
            onChange={(event) => setDraftDueDate(event.target.value)}
          />
          <SelectField
            label="Priority"
            name="priority"
            value={draftPriority}
            onChange={(event) => setDraftPriority(event.target.value)}
            options={priorityOptions}
          />
        </div>
        <TextField
          label="Review by"
          name="reviewByDate"
          type="date"
          value={draftReviewByDate}
          onChange={(event) => setDraftReviewByDate(event.target.value)}
          hint="Optional next check-in date for this recovery action."
        />
        {error ? (
          <div className="rounded-[18px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}
        <Button type="submit" disabled={isPending || !draftTitle.trim()}>
          {isPending ? "Saving..." : "Add follow-up"}
        </Button>
      </form>

      <div className="space-y-3">
        {followUps.length > 0 ? (
          followUps.map((followUp) => (
            <form
              key={followUp.id}
              className="space-y-3 rounded-[18px] bg-[var(--color-surface)] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleUpdate(followUp.id, new FormData(event.currentTarget));
              }}
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--color-foreground)]">{followUp.title}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {followUp.description || "No extra detail added yet."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={getCompanyAdoptionFollowUpStatusLabel(followUp.status)}
                    tone={getCompanyAdoptionFollowUpStatusTone(followUp.status)}
                  />
                  <StatusBadge
                    label={getCompanyAdoptionFollowUpReviewStatusLabel(followUp.reviewStatus)}
                    tone={getCompanyAdoptionFollowUpReviewStatusTone(followUp.reviewStatus)}
                  />
                  <StatusBadge
                    label={getCompanyAdoptionFollowUpOutcomeStatusLabel(followUp.outcomeStatus)}
                    tone={getCompanyAdoptionFollowUpOutcomeStatusTone(followUp.outcomeStatus)}
                  />
                  <StatusBadge
                    label={getCompanyAdoptionFollowUpPriorityLabel(followUp.priority)}
                    tone={getCompanyAdoptionFollowUpPriorityTone(followUp.priority)}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Owner
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {followUp.ownerName || "Not assigned"}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Due
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {formatDate(followUp.dueDate)}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Review by
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {formatDate(followUp.reviewByDate)}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Last reviewed
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {formatDate(followUp.lastReviewedAt)}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Reviewed by
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {followUp.lastReviewedByName || "Not reviewed yet"}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Outcome
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {getCompanyAdoptionFollowUpOutcomeStatusLabel(followUp.outcomeStatus)}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Outcome recorded
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {formatDate(followUp.outcomeRecordedAt)}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Outcome by
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {followUp.outcomeRecordedByName || "Not recorded yet"}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Updated
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {formatDate(followUp.updatedAt)}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Completed
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {formatDate(followUp.completedAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-[16px] bg-white p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Review guidance
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {followUp.reviewRecommendation}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {followUp.reviewNote || "No review note added yet."}
                </p>
              </div>

              <div className="rounded-[16px] bg-white p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Outcome guidance
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {followUp.outcomeRecommendation}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {followUp.outcomeSummary || "No outcome summary added yet."}
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <TextField
                  label="Title"
                  name={`title-${followUp.id}`}
                  defaultValue={followUp.title}
                  required
                />
                <SelectField
                  label="Owner"
                  name={`owner-${followUp.id}`}
                  defaultValue={followUp.ownerId ?? ""}
                  options={[
                    { label: "No owner yet", value: "" },
                    ...ownerOptions,
                  ]}
                />
                <TextAreaField
                  label="Description"
                  name={`description-${followUp.id}`}
                  defaultValue={followUp.description ?? ""}
                  placeholder="Add a short next-step note."
                />
                <TextAreaField
                  label="Review note"
                  name={`reviewNote-${followUp.id}`}
                  defaultValue={followUp.reviewNote ?? ""}
                  placeholder="What did you check, and what should happen before the next review?"
                />
                <TextAreaField
                  label="Outcome summary"
                  name={`outcomeSummary-${followUp.id}`}
                  defaultValue={followUp.outcomeSummary ?? ""}
                  placeholder="Did this recovery step improve adoption, partly help, or fail to move things forward?"
                />
                <div className="grid gap-3 sm:grid-cols-4">
                  <TextField
                    label="Due date"
                    name={`dueDate-${followUp.id}`}
                    type="date"
                    defaultValue={followUp.dueDate ? followUp.dueDate.slice(0, 10) : ""}
                  />
                  <TextField
                    label="Review by"
                    name={`reviewByDate-${followUp.id}`}
                    type="date"
                    defaultValue={followUp.reviewByDate ? followUp.reviewByDate.slice(0, 10) : ""}
                  />
                  <SelectField
                    label="Status"
                    name={`status-${followUp.id}`}
                    defaultValue={followUp.status}
                    options={statusOptions}
                  />
                  <SelectField
                    label="Priority"
                    name={`priority-${followUp.id}`}
                    defaultValue={followUp.priority}
                    options={priorityOptions}
                  />
                </div>
                <SelectField
                  label="Outcome"
                  name={`outcomeStatus-${followUp.id}`}
                  defaultValue={followUp.outcomeStatus}
                  options={outcomeOptions}
                />
              </div>

              <label className="flex items-start gap-3 rounded-[16px] bg-white p-4">
                <input
                  type="checkbox"
                  name={`markReviewed-${followUp.id}`}
                  className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-[var(--color-foreground)]">
                    Mark reviewed now
                  </span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    Use this when you have checked the recovery progress and want to refresh the review cadence.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[16px] bg-white p-4">
                <input
                  type="checkbox"
                  name={`markOutcomeRecorded-${followUp.id}`}
                  className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-[var(--color-foreground)]">
                    Record outcome now
                  </span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    Use this when you want to confirm whether the recovery action improved momentum or not.
                  </span>
                </span>
              </label>

              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save follow-up"}
              </Button>
            </form>
          ))
        ) : (
          <div className="rounded-[18px] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
            No adoption follow-up has been created for {companyName} yet.
          </div>
        )}
      </div>
    </div>
  );
}
