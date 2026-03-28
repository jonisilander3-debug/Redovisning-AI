import {
  CompanyAdoptionFollowUpOutcomeStatus,
  CompanyAdoptionFollowUpPriority,
  CompanyAdoptionFollowUpReviewStatus,
  CompanyAdoptionFollowUpStatus,
} from "@prisma/client";
import { z } from "zod";

export const adoptionFollowUpStatusLabels: Record<CompanyAdoptionFollowUpStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const adoptionFollowUpPriorityLabels: Record<CompanyAdoptionFollowUpPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const adoptionFollowUpReviewStatusLabels: Record<
  CompanyAdoptionFollowUpReviewStatus,
  string
> = {
  NOT_REVIEWED: "Not reviewed",
  REVIEWED_RECENTLY: "Reviewed recently",
  REVIEW_NEEDED: "Review needed",
  OVERDUE_REVIEW: "Overdue review",
};

export const adoptionFollowUpOutcomeStatusLabels: Record<
  CompanyAdoptionFollowUpOutcomeStatus,
  string
> = {
  UNVERIFIED: "Unverified",
  IMPROVED: "Improved",
  PARTIAL_IMPROVEMENT: "Partial improvement",
  NO_PROGRESS: "No progress",
  REGRESSED: "Regressed",
};

export const createCompanyAdoptionFollowUpSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(600).optional().transform((value) => value || ""),
  ownerId: z.string().optional().transform((value) => value || ""),
  dueDate: z.string().optional().transform((value) => value || ""),
  reviewByDate: z.string().optional().transform((value) => value || ""),
  reviewNote: z.string().trim().max(600).optional().transform((value) => value || ""),
  outcomeSummary: z.string().trim().max(600).optional().transform((value) => value || ""),
  outcomeStatus: z
    .nativeEnum(CompanyAdoptionFollowUpOutcomeStatus)
    .default("UNVERIFIED"),
  status: z.nativeEnum(CompanyAdoptionFollowUpStatus).default("OPEN"),
  priority: z.nativeEnum(CompanyAdoptionFollowUpPriority).default("MEDIUM"),
});

export const updateCompanyAdoptionFollowUpSchema = createCompanyAdoptionFollowUpSchema
  .extend({
    markReviewed: z.coerce.boolean().optional().default(false),
    markOutcomeRecorded: z.coerce.boolean().optional().default(false),
  })
  .partial();

export function getCompanyAdoptionFollowUpStatusLabel(status: CompanyAdoptionFollowUpStatus) {
  return adoptionFollowUpStatusLabels[status];
}

export function getCompanyAdoptionFollowUpStatusTone(status: CompanyAdoptionFollowUpStatus) {
  if (status === "DONE") {
    return "success" as const;
  }

  if (status === "IN_PROGRESS") {
    return "accent" as const;
  }

  return "danger" as const;
}

export function getCompanyAdoptionFollowUpPriorityLabel(priority: CompanyAdoptionFollowUpPriority) {
  return adoptionFollowUpPriorityLabels[priority];
}

export function getCompanyAdoptionFollowUpPriorityTone(priority: CompanyAdoptionFollowUpPriority) {
  if (priority === "HIGH") {
    return "danger" as const;
  }

  if (priority === "MEDIUM") {
    return "accent" as const;
  }

  return "default" as const;
}

export function getCompanyAdoptionFollowUpReviewStatusLabel(
  status: CompanyAdoptionFollowUpReviewStatus,
) {
  return adoptionFollowUpReviewStatusLabels[status];
}

export function getCompanyAdoptionFollowUpReviewStatusTone(
  status: CompanyAdoptionFollowUpReviewStatus,
) {
  if (status === "REVIEWED_RECENTLY") {
    return "success" as const;
  }

  if (status === "REVIEW_NEEDED") {
    return "accent" as const;
  }

  if (status === "OVERDUE_REVIEW") {
    return "danger" as const;
  }

  return "default" as const;
}

export function getCompanyAdoptionFollowUpOutcomeStatusLabel(
  status: CompanyAdoptionFollowUpOutcomeStatus,
) {
  return adoptionFollowUpOutcomeStatusLabels[status];
}

export function getCompanyAdoptionFollowUpOutcomeStatusTone(
  status: CompanyAdoptionFollowUpOutcomeStatus,
) {
  if (status === "IMPROVED") {
    return "success" as const;
  }

  if (status === "PARTIAL_IMPROVEMENT") {
    return "accent" as const;
  }

  if (status === "NO_PROGRESS" || status === "REGRESSED") {
    return "danger" as const;
  }

  return "default" as const;
}

export function parseOptionalDate(value?: string) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

export function formatDateLabel(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function getComputedReviewStatus(input: {
  status: CompanyAdoptionFollowUpStatus;
  reviewByDate: Date | null;
  lastReviewedAt: Date | null;
}) {
  if (input.status === "DONE") {
    if (input.lastReviewedAt) {
      return "REVIEWED_RECENTLY" as CompanyAdoptionFollowUpReviewStatus;
    }

    return "NOT_REVIEWED" as CompanyAdoptionFollowUpReviewStatus;
  }

  const now = new Date();

  if (input.reviewByDate && input.reviewByDate.getTime() < now.getTime()) {
    return "OVERDUE_REVIEW" as CompanyAdoptionFollowUpReviewStatus;
  }

  if (!input.lastReviewedAt) {
    return "NOT_REVIEWED" as CompanyAdoptionFollowUpReviewStatus;
  }

  const daysSinceReview = Math.floor(
    (now.getTime() - input.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (input.reviewByDate) {
    const daysUntilReview = Math.floor(
      (input.reviewByDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilReview <= 3) {
      return "REVIEW_NEEDED" as CompanyAdoptionFollowUpReviewStatus;
    }
  }

  if (daysSinceReview >= 14) {
    return "OVERDUE_REVIEW" as CompanyAdoptionFollowUpReviewStatus;
  }

  if (daysSinceReview >= 7) {
    return "REVIEW_NEEDED" as CompanyAdoptionFollowUpReviewStatus;
  }

  return "REVIEWED_RECENTLY" as CompanyAdoptionFollowUpReviewStatus;
}

export function getReviewRecommendation(input: {
  status: CompanyAdoptionFollowUpStatus;
  reviewStatus: CompanyAdoptionFollowUpReviewStatus;
  lastReviewedAt: Date | null;
}) {
  if (input.status === "DONE") {
    return "Recovery action is complete";
  }

  if (!input.lastReviewedAt) {
    return "No review recorded yet";
  }

  if (input.reviewStatus === "OVERDUE_REVIEW") {
    return "Follow-up is overdue for review";
  }

  if (input.reviewStatus === "REVIEW_NEEDED") {
    return "Review this follow-up";
  }

  return "Recovery action is being checked regularly";
}

export function getOutcomeRecommendation(input: {
  outcomeStatus: CompanyAdoptionFollowUpOutcomeStatus;
  status: CompanyAdoptionFollowUpStatus;
  adoptionStatusValue?: string;
}) {
  if (input.outcomeStatus === "IMPROVED") {
    return "Recovery action improved adoption";
  }

  if (input.outcomeStatus === "PARTIAL_IMPROVEMENT") {
    return "Some momentum improved, but more work is still needed";
  }

  if (input.outcomeStatus === "NO_PROGRESS") {
    return "Follow-up reviewed, but no progress recorded";
  }

  if (input.outcomeStatus === "REGRESSED") {
    return "Company still stalled after follow-up";
  }

  if (input.status === "DONE") {
    return "Follow-up is complete, but the outcome is still unverified";
  }

  if (input.adoptionStatusValue === "ACTIVE") {
    return "Momentum looks stronger, but outcome is not recorded yet";
  }

  return "No recovery outcome has been recorded yet";
}

export function getAdoptionFollowUpSummary(
  followUps: Array<{
    status: CompanyAdoptionFollowUpStatus;
    dueDate: Date | null;
    reviewByDate: Date | null;
    lastReviewedAt: Date | null;
    outcomeStatus: CompanyAdoptionFollowUpOutcomeStatus;
  }>,
) {
  const now = new Date();
  const openCount = followUps.filter((item) => item.status !== "DONE").length;
  const overdueCount = followUps.filter(
    (item) => item.status !== "DONE" && item.dueDate && item.dueDate.getTime() < now.getTime(),
  ).length;
  const staleReviewCount = followUps.filter((item) => {
    if (item.status === "DONE") {
      return false;
    }

    const reviewStatus = getComputedReviewStatus({
      status: item.status,
      reviewByDate: item.reviewByDate,
      lastReviewedAt: item.lastReviewedAt,
    });

    return reviewStatus === "REVIEW_NEEDED" || reviewStatus === "OVERDUE_REVIEW";
  }).length;
  const overdueReviewCount = followUps.filter((item) => {
    if (item.status === "DONE") {
      return false;
    }

    return (
      getComputedReviewStatus({
        status: item.status,
        reviewByDate: item.reviewByDate,
        lastReviewedAt: item.lastReviewedAt,
      }) === "OVERDUE_REVIEW"
    );
  }).length;
  const noProgressCount = followUps.filter(
    (item) => item.outcomeStatus === "NO_PROGRESS" || item.outcomeStatus === "REGRESSED",
  ).length;

  return {
    openCount,
    overdueCount,
    staleReviewCount,
    overdueReviewCount,
    noProgressCount,
    hasOpenFollowUp: openCount > 0,
  };
}
