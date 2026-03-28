"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";

type CompanyAdoptionFollowUpsPageProps = {
  companySlug: string;
  group: {
    name: string;
  };
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    adoptionStatus: {
      value: string;
      label: string;
      tone: "success" | "accent" | "danger" | "default";
      stalledReason: string | null;
    };
    adoptionFollowUpSummary: {
      openCount: number;
      overdueCount: number;
      staleReviewCount: number;
      overdueReviewCount: number;
      noProgressCount: number;
      hasOpenFollowUp: boolean;
    };
    adoptionFollowUps: Array<{
      id: string;
      title: string;
      ownerName: string | null;
      dueDate: string | null;
      reviewByDate: string | null;
      lastReviewedAt: string | null;
      lastReviewedByName: string | null;
      reviewStatus: "NOT_REVIEWED" | "REVIEWED_RECENTLY" | "REVIEW_NEEDED" | "OVERDUE_REVIEW";
      reviewRecommendation: string;
      outcomeStatus: "UNVERIFIED" | "IMPROVED" | "PARTIAL_IMPROVEMENT" | "NO_PROGRESS" | "REGRESSED";
      outcomeSummary: string | null;
      outcomeRecordedAt: string | null;
      outcomeRecordedByName: string | null;
      outcomeRecommendation: string;
      status: "OPEN" | "IN_PROGRESS" | "DONE";
      priority: "LOW" | "MEDIUM" | "HIGH";
    }>;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getReviewTone(status: string) {
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

function getReviewLabel(status: string) {
  if (status === "REVIEWED_RECENTLY") {
    return "Reviewed recently";
  }

  if (status === "REVIEW_NEEDED") {
    return "Review needed";
  }

  if (status === "OVERDUE_REVIEW") {
    return "Overdue review";
  }

  return "Not reviewed";
}

function getOutcomeTone(status: string) {
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

function getOutcomeLabel(status: string) {
  if (status === "IMPROVED") {
    return "Improved";
  }

  if (status === "PARTIAL_IMPROVEMENT") {
    return "Partial improvement";
  }

  if (status === "NO_PROGRESS") {
    return "No progress";
  }

  if (status === "REGRESSED") {
    return "Regressed";
  }

  return "Unverified";
}

export function CompanyAdoptionFollowUpsPage({
  companySlug,
  group,
  companies,
}: CompanyAdoptionFollowUpsPageProps) {
  const [selectedOwner, setSelectedOwner] = useState("");
  const [selectedReviewStatus, setSelectedReviewStatus] = useState("");
  const [selectedOutcomeStatus, setSelectedOutcomeStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState("ALL");

  const ownerOptions = useMemo(() => {
    const ownerMap = new Map<string, string>();

    companies.forEach((company) => {
      company.adoptionFollowUps.forEach((followUp) => {
        if (followUp.ownerName) {
          ownerMap.set(followUp.ownerName, followUp.ownerName);
        }
      });
    });

    return [...ownerMap.values()].sort();
  }, [companies]);

  const filteredCompanies = useMemo(
    () =>
      companies
        .map((company) => ({
          ...company,
          adoptionFollowUps: company.adoptionFollowUps.filter((followUp) => {
            if (selectedOwner && followUp.ownerName !== selectedOwner) {
              return false;
            }

            if (selectedReviewStatus && followUp.reviewStatus !== selectedReviewStatus) {
              return false;
            }

            if (selectedOutcomeStatus && followUp.outcomeStatus !== selectedOutcomeStatus) {
              return false;
            }

            if (
              overdueOnly === "OVERDUE_ONLY" &&
              followUp.reviewStatus !== "OVERDUE_REVIEW" &&
              !(followUp.status !== "DONE" && followUp.dueDate && new Date(followUp.dueDate) < new Date())
            ) {
              return false;
            }

            return true;
          }),
        }))
        .filter(
          (company) =>
            company.adoptionFollowUps.length > 0 ||
            (overdueOnly !== "ALL" ? false : company.adoptionFollowUpSummary.openCount > 0),
        ),
    [companies, overdueOnly, selectedOutcomeStatus, selectedOwner, selectedReviewStatus],
  );

  const companiesWithOpenFollowUps = companies.filter(
    (company) => company.adoptionFollowUpSummary.openCount > 0,
  );
  const stalledWithoutFollowUp = companies.filter(
    (company) =>
      (company.adoptionStatus.value === "IDLE_AFTER_SETUP" ||
        company.adoptionStatus.value === "STALLED_AFTER_START") &&
      !company.adoptionFollowUpSummary.hasOpenFollowUp,
  );
  const overdueReviewItems = companies.flatMap((company) =>
    company.adoptionFollowUps
      .filter((followUp) => followUp.reviewStatus === "OVERDUE_REVIEW")
      .map((followUp) => ({
        companyName: company.name,
        companySlug: company.slug,
        ...followUp,
      })),
  );
  const weakOutcomeCompanies = companies.filter(
    (company) => company.adoptionFollowUpSummary.noProgressCount > 0,
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Adoption Follow-ups"
        title="Track the next recovery step across the group"
        description={`${group.name} now shows which companies have a clear recovery owner, which follow-ups need review, and which stalled companies still need a next action.`}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">Companies with open follow-up</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {companiesWithOpenFollowUps.length}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">Overdue follow-ups</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {companies.reduce((sum, company) => sum + company.adoptionFollowUpSummary.overdueCount, 0)}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">Overdue reviews</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {overdueReviewItems.length}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">Weak outcomes</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {weakOutcomeCompanies.length}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">Stalled with no action</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {stalledWithoutFollowUp.length}
          </p>
        </Card>
      </section>

      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Filters</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Narrow the recovery review list
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField
            label="Owner"
            name="owner"
            value={selectedOwner}
            onChange={(event) => setSelectedOwner(event.target.value)}
            options={[
              { label: "All owners", value: "" },
              ...ownerOptions.map((owner) => ({ label: owner, value: owner })),
            ]}
          />
          <SelectField
            label="Review status"
            name="reviewStatus"
            value={selectedReviewStatus}
            onChange={(event) => setSelectedReviewStatus(event.target.value)}
            options={[
              { label: "All review states", value: "" },
              { label: "Not reviewed", value: "NOT_REVIEWED" },
              { label: "Reviewed recently", value: "REVIEWED_RECENTLY" },
              { label: "Review needed", value: "REVIEW_NEEDED" },
              { label: "Overdue review", value: "OVERDUE_REVIEW" },
            ]}
          />
          <SelectField
            label="Outcome"
            name="outcomeStatus"
            value={selectedOutcomeStatus}
            onChange={(event) => setSelectedOutcomeStatus(event.target.value)}
            options={[
              { label: "All outcomes", value: "" },
              { label: "Unverified", value: "UNVERIFIED" },
              { label: "Improved", value: "IMPROVED" },
              { label: "Partial improvement", value: "PARTIAL_IMPROVEMENT" },
              { label: "No progress", value: "NO_PROGRESS" },
              { label: "Regressed", value: "REGRESSED" },
            ]}
          />
          <SelectField
            label="Urgency"
            name="overdueOnly"
            value={overdueOnly}
            onChange={(event) => setOverdueOnly(event.target.value)}
            options={[
              { label: "All follow-ups", value: "ALL" },
              { label: "Overdue review only", value: "OVERDUE_ONLY" },
            ]}
          />
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Follow-up list
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Recovery actions and their review cadence
            </h2>
          </div>

          <div className="space-y-3">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <div key={company.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">{company.name}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {company.adoptionStatus.label}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        label={`${company.adoptionFollowUpSummary.openCount} open`}
                        tone={company.adoptionFollowUpSummary.openCount > 0 ? "accent" : "default"}
                      />
                      {company.adoptionFollowUpSummary.overdueReviewCount > 0 ? (
                        <StatusBadge
                          label={`${company.adoptionFollowUpSummary.overdueReviewCount} overdue review`}
                          tone="danger"
                        />
                      ) : null}
                      {company.adoptionFollowUpSummary.noProgressCount > 0 ? (
                        <StatusBadge
                          label={`${company.adoptionFollowUpSummary.noProgressCount} weak outcome`}
                          tone="danger"
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {company.adoptionFollowUps.map((followUp) => (
                      <div key={followUp.id} className="rounded-[16px] bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-[var(--color-foreground)]">{followUp.title}</p>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              label={followUp.status === "IN_PROGRESS" ? "In progress" : followUp.status === "DONE" ? "Done" : "Open"}
                              tone={followUp.status === "DONE" ? "success" : followUp.status === "IN_PROGRESS" ? "accent" : "danger"}
                            />
                            <StatusBadge
                              label={getReviewLabel(followUp.reviewStatus)}
                              tone={getReviewTone(followUp.reviewStatus)}
                            />
                            <StatusBadge
                              label={getOutcomeLabel(followUp.outcomeStatus)}
                              tone={getOutcomeTone(followUp.outcomeStatus)}
                            />
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                          {followUp.ownerName ? `Owner: ${followUp.ownerName}` : "No owner assigned"} - review by {formatDate(followUp.reviewByDate)} - last reviewed {formatDate(followUp.lastReviewedAt)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                          {followUp.reviewRecommendation}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                          {followUp.outcomeRecommendation}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/workspace/${company.slug}/company-structure`}
                    className="mt-3 inline-flex text-sm font-semibold text-[var(--color-primary)]"
                  >
                    Open company detail
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
                No follow-ups match the current filters.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Review warnings
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Follow-ups that need checking
              </h2>
            </div>
            <div className="space-y-3">
              {overdueReviewItems.length > 0 ? (
                overdueReviewItems.map((followUp) => (
                  <div key={followUp.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-foreground)]">{followUp.title}</p>
                      <StatusBadge label="Overdue review" tone="danger" />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                      {followUp.companyName} - {followUp.ownerName || "No owner assigned"} - review by {formatDate(followUp.reviewByDate)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
                  No adoption follow-up is overdue for review right now.
                </div>
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Weak recovery outcomes
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Companies where follow-ups are not improving momentum yet
              </h2>
            </div>
            <div className="space-y-3">
              {weakOutcomeCompanies.length > 0 ? (
                weakOutcomeCompanies.map((company) => (
                  <div key={company.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-foreground)]">{company.name}</p>
                      <StatusBadge label={`${company.adoptionFollowUpSummary.noProgressCount} weak outcome`} tone="danger" />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                      Consider a stronger next step if recent recovery actions still show no progress or regression.
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
                  No company currently shows repeated weak recovery outcomes.
                </div>
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Needs action now
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Stalled companies without a next step
              </h2>
            </div>
            <div className="space-y-3">
              {stalledWithoutFollowUp.length > 0 ? (
                stalledWithoutFollowUp.map((company) => (
                  <div key={company.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-foreground)]">{company.name}</p>
                      <StatusBadge label={company.adoptionStatus.label} tone="danger" />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                      {company.adoptionStatus.stalledReason || "This company needs a clear recovery owner and next action."}
                    </p>
                    <Link
                      href={`/workspace/${companySlug}/group-admin`}
                      className="mt-3 inline-flex text-sm font-semibold text-[var(--color-primary)]"
                    >
                      Add follow-up in Group Admin
                    </Link>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
                  Every stalled or idle company currently has a follow-up assigned.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
