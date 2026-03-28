"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CompanyAdoptionFollowUpPanel } from "@/components/company/company-adoption-follow-up-panel";
import { MemberCompanyAccessPanel } from "@/components/members/member-company-access-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type GroupAdminPageProps = {
  companySlug: string;
  currentCompanyName: string;
  group: {
    id: string;
    name: string;
    slug: string;
  };
  summary: {
    companyCount: number;
    memberCount: number;
    holdingCount: number;
    sharedMembersCount: number;
  };
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    organizationNumber: string;
    legalFormLabel: string;
    companyTypeValue: string;
    companyTypeLabel: string;
    isHoldingCompany: boolean;
    workspaceManagerId: string | null;
    workspaceManagerName: string | null;
    workspaceManagerEmail: string | null;
    starterSetupNote: string | null;
    parentCompanyId: string | null;
    parentCompanyName: string | null;
    memberCount: number;
    ownerAdminCount: number;
    employeeCount: number;
    childCompanies: string[];
    isCurrentCompany: boolean;
    setupState: {
      value: string;
      label: string;
      tone: "success" | "accent" | "danger";
      description: string;
      recommendations: Array<{
        label: string;
        tone: "danger" | "accent" | "success";
      }>;
    };
    adoptionStatus: {
      value: string;
      label: string;
      tone: "success" | "accent" | "danger" | "default";
      description: string;
      stalledReason: string | null;
      followUpState: {
        label: string;
        tone: "success" | "accent" | "danger" | "default";
        description: string;
      };
      recommendations: Array<{
        label: string;
        tone: "danger" | "accent" | "success";
      }>;
      timeline: Array<{
        label: string;
        reached: boolean;
        dateLabel: string | null;
      }>;
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
    }>;
    currentMembers: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      roleLabel: string;
      isPrimaryCompany: boolean;
    }>;
  }>;
  members: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    statusLabel: string;
    primaryCompanyId: string;
    primaryCompanyName: string;
    accessCoverageLabel: string;
    companyAccesses: Array<{
      id: string;
      companyId: string;
      companyName: string;
      role: string;
      roleLabel: string;
      groupName: string | null;
      isCurrentCompany: boolean;
      isPrimaryCompany: boolean;
    }>;
  }>;
  parentCompanyOptions: Array<{
    label: string;
    value: string;
  }>;
  groupCompanyOptions: Array<{
    label: string;
    value: string;
  }>;
  attachableCompanies: Array<{
    label: string;
    value: string;
  }>;
  companyTypeOptions: Array<{
    label: string;
    value: string;
  }>;
  legalFormOptions: Array<{
    label: string;
    value: string;
  }>;
  roleOptions: Array<{
    label: string;
    value: string;
  }>;
  memberOptions: Array<{
    label: string;
    value: string;
  }>;
};

function getStatusTone(status: string) {
  if (status === "ACTIVE") {
    return "success" as const;
  }

  if (status === "INVITED") {
    return "accent" as const;
  }

  return "default" as const;
}

export function GroupAdminPage({
  companySlug,
  currentCompanyName,
  group,
  summary,
  companies,
  members,
  parentCompanyOptions,
  groupCompanyOptions,
  attachableCompanies,
  companyTypeOptions,
  legalFormOptions,
  roleOptions,
  memberOptions,
}: GroupAdminPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [structureError, setStructureError] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedAttachCompanyId, setSelectedAttachCompanyId] = useState("");
  const [selectedAttachType, setSelectedAttachType] = useState("OPERATING");
  const [newLegalForm, setNewLegalForm] = useState("LIMITED_COMPANY");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [starterError, setStarterError] = useState<string | null>(null);

  const supportsStructure = newLegalForm !== "SOLE_PROPRIETORSHIP";

  function handleUpdateCompany(companyId: string, formData: FormData) {
    setStructureError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/group-admin/companies/${companyId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyType: String(formData.get(`companyType-${companyId}`) ?? "OPERATING"),
            parentCompanyId: String(formData.get(`parentCompanyId-${companyId}`) ?? ""),
            isHoldingCompany: formData.get(`isHoldingCompany-${companyId}`) === "on",
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setStructureError(data.message ?? "We could not update this group company.");
        return;
      }

      router.refresh();
    });
  }

  function handleAttachCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttachError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/group-admin/companies/attach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyId: selectedAttachCompanyId,
            companyType: selectedAttachType,
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setAttachError(data.message ?? "We could not attach that company to this group.");
        return;
      }

      setSelectedAttachCompanyId("");
      setSelectedAttachType("OPERATING");
      router.refresh();
    });
  }

  function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/group-admin/companies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(formData.get("companyName") ?? ""),
          slug: String(formData.get("companySlug") ?? ""),
          organizationNumber: String(formData.get("organizationNumber") ?? ""),
          legalForm: String(formData.get("legalForm") ?? "LIMITED_COMPANY"),
          companyType: supportsStructure
            ? String(formData.get("companyType") ?? "OPERATING")
            : "OPERATING",
          parentCompanyId: supportsStructure
            ? String(formData.get("parentCompanyId") ?? "")
            : "",
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setCreateError(data.message ?? "We could not create that company.");
        return;
      }

      form.reset();
      setNewLegalForm("LIMITED_COMPANY");
      router.refresh();
    });
  }

  function handleSetupMembership(companyId: string, formData: FormData) {
    setSetupError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/group-admin/companies/${companyId}/setup-membership`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: String(formData.get(`setupUser-${companyId}`) ?? ""),
            role: String(formData.get(`setupRole-${companyId}`) ?? "ADMIN"),
            makePrimary: formData.get(`setupPrimary-${companyId}`) === "on",
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setSetupError(data.message ?? "We could not complete the company setup.");
        return;
      }

      router.refresh();
    });
  }

  function handleStarterSetup(companyId: string, formData: FormData) {
    setStarterError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/group-admin/companies/${companyId}/starter-setup`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspaceManagerId: String(formData.get(`workspaceManager-${companyId}`) ?? ""),
            starterSetupNote: String(formData.get(`starterNote-${companyId}`) ?? ""),
          }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setStarterError(data.message ?? "We could not save the starter setup.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Group Admin"
        title="Manage the companies and access around your business group"
        description={`${group.name} is connected through ${currentCompanyName}. Keep the structure tidy, make access visible, and update people and companies without jumping between workspaces.`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">Companies in group</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {summary.companyCount}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Shared under {group.name}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">People with access</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {summary.memberCount}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Across all connected companies
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">Holding companies</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {summary.holdingCount}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Clear top-level structure at a glance
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">Shared members</p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {summary.sharedMembersCount}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            People active in more than one company
          </p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Group structure
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              See how the companies connect
            </h2>
          </div>

          <div className="space-y-3">
            {companies.map((company) => (
              <div
                key={company.id}
                className="rounded-[22px] bg-white p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {company.name}
                      </p>
                      {company.isCurrentCompany ? (
                        <StatusBadge label="Current workspace" tone="success" />
                      ) : null}
                      <StatusBadge
                        label={company.setupState.label}
                        tone={company.setupState.tone}
                      />
                      <StatusBadge
                        label={company.adoptionStatus.label}
                        tone={company.adoptionStatus.tone}
                      />
                      <StatusBadge
                        label={company.adoptionStatus.followUpState.label}
                        tone={company.adoptionStatus.followUpState.tone}
                      />
                      <StatusBadge label={company.companyTypeLabel} tone="primary" />
                      <StatusBadge label={company.legalFormLabel} tone="accent" />
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {company.parentCompanyName
                        ? `Reports to ${company.parentCompanyName}`
                        : "Top-level company in this group"}
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {company.setupState.description}
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {company.adoptionStatus.description}
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {company.adoptionStatus.followUpState.description}
                    </p>
                    {company.adoptionStatus.stalledReason ? (
                      <p className="text-sm text-[var(--color-danger)]">
                        {company.adoptionStatus.stalledReason}
                      </p>
                    ) : null}
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {company.workspaceManagerName
                        ? `Workspace manager: ${company.workspaceManagerName}`
                        : "No default workspace manager assigned yet"}
                    </p>
                    {company.childCompanies.length > 0 ? (
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        Child companies: {company.childCompanies.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 rounded-[20px] bg-[var(--color-surface)] px-4 py-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                        Members
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                        {company.memberCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                        Owners/Admins
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                        {company.ownerAdminCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                        Employees
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                        {company.employeeCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                        Momentum
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                        {company.adoptionStatus.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                        Open follow-ups
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                        {company.adoptionFollowUpSummary.openCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3 rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        Company setup
                      </p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        Add the first responsible person and make the company ready to use.
                      </p>
                    </div>
                    <StatusBadge
                      label={
                        company.setupState.value === "READY"
                          ? "Ready for use"
                          : company.setupState.value === "ADMIN_MISSING"
                            ? "Add first admin"
                            : "Complete setup"
                      }
                      tone={company.setupState.tone}
                    />
                  </div>

                  {company.currentMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {company.currentMembers.map((member) => (
                        <StatusBadge
                          key={`${company.id}-${member.id}`}
                          label={`${member.name} · ${member.roleLabel}${member.isPrimaryCompany ? " · Primary" : ""}`}
                          tone={member.role === "OWNER" || member.role === "ADMIN" ? "primary" : "default"}
                        />
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      Starter recommendations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {company.setupState.recommendations.map((recommendation) => (
                        <StatusBadge
                          key={`${company.id}-${recommendation.label}`}
                          label={recommendation.label}
                          tone={recommendation.tone}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      Adoption recommendations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {company.adoptionStatus.recommendations.map((recommendation) => (
                        <StatusBadge
                          key={`${company.id}-adoption-${recommendation.label}`}
                          label={recommendation.label}
                          tone={recommendation.tone}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        Recovery follow-through
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={`${company.adoptionFollowUpSummary.openCount} open`}
                          tone={company.adoptionFollowUpSummary.openCount > 0 ? "accent" : "default"}
                        />
                        {company.adoptionFollowUpSummary.overdueCount > 0 ? (
                          <StatusBadge
                            label={`${company.adoptionFollowUpSummary.overdueCount} overdue`}
                            tone="danger"
                          />
                        ) : null}
                        {company.adoptionFollowUpSummary.overdueReviewCount > 0 ? (
                          <StatusBadge
                            label={`${company.adoptionFollowUpSummary.overdueReviewCount} overdue review`}
                            tone="danger"
                          />
                        ) : null}
                        {company.adoptionFollowUpSummary.staleReviewCount > 0 ? (
                          <StatusBadge
                            label={`${company.adoptionFollowUpSummary.staleReviewCount} stale review`}
                            tone="accent"
                          />
                        ) : null}
                        {company.adoptionFollowUpSummary.noProgressCount > 0 ? (
                          <StatusBadge
                            label={`${company.adoptionFollowUpSummary.noProgressCount} weak outcome`}
                            tone="danger"
                          />
                        ) : null}
                        {!company.adoptionFollowUpSummary.hasOpenFollowUp &&
                        (company.adoptionStatus.value === "IDLE_AFTER_SETUP" ||
                          company.adoptionStatus.value === "STALLED_AFTER_START") ? (
                          <StatusBadge label="No recovery owner yet" tone="danger" />
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {company.adoptionFollowUps[0]?.ownerName
                        ? `Current recovery owner: ${company.adoptionFollowUps[0].ownerName}`
                        : "No recovery owner is assigned yet."}
                    </p>
                    {company.adoptionFollowUpSummary.overdueReviewCount > 0 ? (
                      <p className="text-sm text-[var(--color-danger)]">
                        Some recovery actions are overdue for review.
                      </p>
                    ) : company.adoptionFollowUpSummary.noProgressCount > 0 ? (
                      <p className="text-sm text-[var(--color-danger)]">
                        Recent recovery work has not improved adoption enough yet.
                      </p>
                    ) : company.adoptionFollowUpSummary.staleReviewCount > 0 ? (
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        Some recovery actions need a fresh review soon.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      Activation summary
                    </p>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {company.adoptionStatus.timeline.map((signal) => (
                        <div
                          key={`${company.id}-${signal.label}`}
                          className="rounded-[18px] bg-white p-3"
                        >
                          <p className="text-sm font-semibold text-[var(--color-foreground)]">
                            {signal.label}
                          </p>
                          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                            {signal.reached
                              ? signal.dateLabel || "Reached"
                              : "Not yet"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <CompanyAdoptionFollowUpPanel
                    companyId={company.id}
                    companyName={company.name}
                    createPath={`/api/workspace/${companySlug}/group-admin/companies/${company.id}/adoption-follow-ups`}
                    updatePathBase={`/api/workspace/${companySlug}/group-admin/companies/${company.id}/adoption-follow-ups`}
                    followUps={company.adoptionFollowUps}
                    ownerOptions={company.currentMembers.map((member) => ({
                      value: member.id,
                      label: `${member.name} - ${member.roleLabel}`,
                    }))}
                    recommendations={company.adoptionStatus.recommendations}
                    compact
                  />

                  <form
                    className="grid gap-3 lg:grid-cols-[1.2fr_220px_auto]"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSetupMembership(company.id, new FormData(event.currentTarget));
                    }}
                  >
                    <SelectField
                      label="Add person"
                      name={`setupUser-${company.id}`}
                      defaultValue=""
                      options={[
                        { label: "Choose person", value: "" },
                        ...memberOptions,
                      ]}
                    />
                    <SelectField
                      label="Role in this company"
                      name={`setupRole-${company.id}`}
                      defaultValue={company.ownerAdminCount === 0 ? "ADMIN" : "MANAGER"}
                      options={roleOptions}
                    />
                    <div className="flex items-end">
                      <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Add to company"}
                      </Button>
                    </div>
                    <label className="lg:col-span-3 flex items-start gap-3 rounded-[18px] bg-white p-4">
                      <input
                        type="checkbox"
                        name={`setupPrimary-${company.id}`}
                        className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-semibold text-[var(--color-foreground)]">
                          Set this as the person&apos;s primary workspace
                        </span>
                        <span className="block text-xs text-[var(--color-muted-foreground)]">
                          Useful when this person will mainly run the new company day to day.
                        </span>
                      </span>
                    </label>
                  </form>

                  <form
                    className="space-y-4 rounded-[18px] bg-white p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleStarterSetup(company.id, new FormData(event.currentTarget));
                    }}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        Handoff and starter setup
                      </p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        Clarify who will run the company day to day and what should happen next.
                      </p>
                    </div>

                    <SelectField
                      label="Default workspace manager"
                      name={`workspaceManager-${company.id}`}
                      defaultValue={company.workspaceManagerId ?? ""}
                      options={[
                        { label: "No manager assigned yet", value: "" },
                        ...company.currentMembers.map((member) => ({
                          label: `${member.name} · ${member.roleLabel}`,
                          value: member.id,
                        })),
                      ]}
                    />
                    <TextAreaField
                      label="Starter handoff note"
                      name={`starterNote-${company.id}`}
                      defaultValue={company.starterSetupNote ?? ""}
                      placeholder="Who will run this company, what should happen first, and what still needs attention?"
                    />
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Saving..." : "Save starter setup"}
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Create company
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Add a new company directly into this group
              </h2>
            </div>

            <form className="space-y-4" onSubmit={handleCreateCompany}>
              <TextField
                label="Company name"
                name="companyName"
                placeholder="Northstar Property AB"
                required
              />
              <TextField
                label="Company slug"
                name="companySlug"
                placeholder="northstar-property"
                hint="Used in workspace links and company switching."
                required
              />
              <TextField
                label="Organization number"
                name="organizationNumber"
                placeholder="559123-4567"
                required
              />
              <SelectField
                label="Legal form"
                name="legalForm"
                value={newLegalForm}
                onChange={(event) => setNewLegalForm(event.target.value)}
                options={legalFormOptions}
              />

              {supportsStructure ? (
                <>
                  <SelectField
                    label="Company type"
                    name="companyType"
                    defaultValue="OPERATING"
                    options={companyTypeOptions}
                  />
                  <SelectField
                    label="Parent company"
                    name="parentCompanyId"
                    defaultValue=""
                    options={[
                      { label: "No parent company", value: "" },
                      ...parentCompanyOptions,
                    ]}
                  />
                </>
              ) : (
                <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  Enskild firma is kept simple here. It will be created inside the group with a standalone practical setup, without parent-company placement.
                </div>
              )}

              {createError ? (
                <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  {createError}
                </div>
              ) : null}

              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create company"}
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Attach existing company
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Add another company to this group
              </h2>
            </div>

            <form className="space-y-4" onSubmit={handleAttachCompany}>
              <SelectField
                label="Company"
                name="attachCompanyId"
                value={selectedAttachCompanyId}
                onChange={(event) => setSelectedAttachCompanyId(event.target.value)}
                options={[
                  { label: "Choose company", value: "" },
                  ...attachableCompanies,
                ]}
              />
              <SelectField
                label="Company role in group"
                name="attachCompanyType"
                value={selectedAttachType}
                onChange={(event) => setSelectedAttachType(event.target.value)}
                options={companyTypeOptions}
              />
              {attachError ? (
                <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  {attachError}
                </div>
              ) : null}
              <Button type="submit" disabled={isPending || !selectedAttachCompanyId}>
                {isPending ? "Attaching..." : "Attach company"}
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Group-aware company settings
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Keep structure and ownership clear
              </h2>
            </div>

            <div className="space-y-4">
              {companies.map((company) => (
                <form
                  key={company.id}
                  className="space-y-4 rounded-[20px] bg-[var(--color-surface)] p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleUpdateCompany(company.id, new FormData(event.currentTarget));
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {company.name}
                      </p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {company.organizationNumber}
                      </p>
                    </div>
                    <StatusBadge label={company.companyTypeLabel} tone="accent" />
                  </div>

                  <SelectField
                    label="Company type"
                    name={`companyType-${company.id}`}
                    defaultValue={company.companyTypeValue}
                    options={companyTypeOptions}
                  />
                  <SelectField
                    label="Parent company"
                    name={`parentCompanyId-${company.id}`}
                    defaultValue={company.parentCompanyId ?? ""}
                    options={[
                      { label: "No parent company", value: "" },
                      ...parentCompanyOptions.filter((option) => option.value !== company.id),
                    ]}
                  />
                  <label className="flex items-start gap-3 rounded-[18px] bg-white p-4">
                    <input
                      type="checkbox"
                      name={`isHoldingCompany-${company.id}`}
                      defaultChecked={company.isHoldingCompany}
                      className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold text-[var(--color-foreground)]">
                        Mark as holding company
                      </span>
                      <span className="block text-xs text-[var(--color-muted-foreground)]">
                        Use this when the company mainly sits above other entities in the group.
                      </span>
                    </span>
                  </label>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Save group settings"}
                  </Button>
                </form>
              ))}
            </div>

            {structureError ? (
              <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {structureError}
              </div>
            ) : null}
            {setupError ? (
              <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {setupError}
              </div>
            ) : null}
            {starterError ? (
              <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {starterError}
              </div>
            ) : null}
          </Card>
        </div>
      </section>

      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Group access
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            See who can work across the group
          </h2>
        </div>

        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="rounded-[22px] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {member.name}
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {member.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={member.accessCoverageLabel} tone="primary" />
                    <StatusBadge
                      label={member.statusLabel}
                      tone={getStatusTone(member.status)}
                    />
                    <StatusBadge
                      label={`Primary: ${member.primaryCompanyName}`}
                      tone="accent"
                    />
                  </div>
                </div>

                <MemberCompanyAccessPanel
                  companySlug={companySlug}
                  memberId={member.id}
                  apiBasePath={`/api/workspace/${companySlug}/group-admin/members/${member.id}`}
                  title="Group company access"
                  description="Add, remove, and adjust company access across this group without switching workspace."
                  accesses={member.companyAccesses}
                  availableCompanies={groupCompanyOptions.filter(
                    (company) =>
                      !member.companyAccesses.some(
                        (access) => access.companyId === company.value,
                      ),
                  )}
                  roleOptions={roleOptions}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
