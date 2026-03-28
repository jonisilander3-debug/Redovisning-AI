"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CompanyAdoptionFollowUpPanel } from "@/components/company/company-adoption-follow-up-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";

type CompanyStructurePageProps = {
  companySlug: string;
  companyName: string;
  company: {
    id: string;
    name: string;
    organizationNumber: string;
    bankIban: string | null;
    bankBic: string | null;
    bankExportProfile: string;
    legalFormLabel: string;
    legalFormValue: string;
    companyTypeLabel: string;
    companyTypeValue: string;
    isHoldingCompany: boolean;
    supportsGroupStructure: boolean;
    group: {
      id: string;
      name: string;
      slug: string;
    } | null;
    workspaceManager: {
      id: string;
      name: string;
      email: string;
    } | null;
    starterSetupNote: string | null;
    starterReadiness: {
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
    teamSummary: {
      memberCount: number;
      ownerAdminCount: number;
      employeeCount: number;
    };
    ownerOptions: Array<{
      value: string;
      label: string;
    }>;
    parentCompany: {
      id: string;
      name: string;
      companyTypeLabel: string;
    } | null;
    childCompanies: Array<{
      id: string;
      name: string;
      companyTypeLabel: string;
    }>;
  };
  groups: Array<{
    id: string;
    name: string;
  }>;
  companyOptions: Array<{
    label: string;
    value: string;
  }>;
  companyTypeOptions: Array<{
    label: string;
    value: string;
  }>;
  bankFileExportProfileOptions: Array<{
    label: string;
    value: string;
  }>;
  legalFormOptions: Array<{
    label: string;
    value: string;
  }>;
};

export function CompanyStructurePage({
  companySlug,
  companyName,
  company,
  groups,
  companyOptions,
  companyTypeOptions,
  bankFileExportProfileOptions,
  legalFormOptions,
}: CompanyStructurePageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGroupError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/company-structure/group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(formData.get("groupName") ?? ""),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setGroupError(data.message ?? "We could not create that group.");
        return;
      }

      router.refresh();
    });
  }

  function handleUpdateStructure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/company-structure`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: String(formData.get("groupId") ?? ""),
          parentCompanyId: String(formData.get("parentCompanyId") ?? ""),
          bankIban: String(formData.get("bankIban") ?? ""),
          bankBic: String(formData.get("bankBic") ?? ""),
          bankExportProfile: String(formData.get("bankExportProfile") ?? "PAIN_001"),
          legalForm: String(formData.get("legalForm") ?? "LIMITED_COMPANY"),
          companyType: String(formData.get("companyType") ?? "OPERATING"),
          isHoldingCompany: formData.get("isHoldingCompany") === "on",
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update the company structure.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Company Structure"
        title="Set how this company sits in the wider business structure"
        description={`${companyName} can stay standalone or be connected into a wider group with a holding or subsidiary structure.`}
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Current structure
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              How this workspace is positioned
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge label={company.legalFormLabel} tone="primary" />
            <StatusBadge label={company.companyTypeLabel} tone="primary" />
            <StatusBadge
              label={company.group ? `Group: ${company.group.name}` : "Standalone company"}
              tone={company.group ? "accent" : "default"}
            />
            <StatusBadge label={company.starterReadiness.label} tone={company.starterReadiness.tone} />
            <StatusBadge label={company.adoptionStatus.label} tone={company.adoptionStatus.tone} />
            <StatusBadge
              label={company.adoptionStatus.followUpState.label}
              tone={company.adoptionStatus.followUpState.tone}
            />
            {company.isHoldingCompany ? (
              <StatusBadge label="Holding company" tone="success" />
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Legal form</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {company.legalFormLabel}
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Organization number</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {company.organizationNumber}
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Bank IBAN</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {company.bankIban || "Not set"}
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Bank BIC</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {company.bankBic || "Not set"}
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4 md:col-span-2">
              <p className="text-sm text-[var(--color-muted-foreground)]">Payroll bank file</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {bankFileExportProfileOptions.find((option) => option.value === company.bankExportProfile)?.label ??
                  company.bankExportProfile}
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4 md:col-span-2">
              <p className="text-sm text-[var(--color-muted-foreground)]">Parent company</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {company.parentCompany?.name || "None"}
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Workspace manager</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {company.workspaceManager?.name || "Not assigned yet"}
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Starter team</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {company.teamSummary.memberCount} members
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {company.teamSummary.ownerAdminCount} owner/admin and {company.teamSummary.employeeCount} employee
              </p>
            </div>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4 md:col-span-2">
              <p className="text-sm text-[var(--color-muted-foreground)]">Adoption momentum</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                {company.adoptionStatus.label}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {company.adoptionStatus.description}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {company.adoptionStatus.followUpState.description}
              </p>
              {company.adoptionStatus.stalledReason ? (
                <p className="mt-1 text-sm text-[var(--color-danger)]">
                  {company.adoptionStatus.stalledReason}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Starter handoff
            </p>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {company.starterReadiness.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {company.starterReadiness.recommendations.map((recommendation) => (
                  <StatusBadge
                    key={recommendation.label}
                    label={recommendation.label}
                    tone={recommendation.tone}
                  />
                ))}
              </div>
              {company.starterSetupNote ? (
                <p className="mt-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {company.starterSetupNote}
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  No internal handoff note has been added yet.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Adoption summary
            </p>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4">
              <div className="flex flex-wrap gap-2">
                {company.adoptionStatus.recommendations.map((recommendation) => (
                  <StatusBadge
                    key={recommendation.label}
                    label={recommendation.label}
                    tone={recommendation.tone}
                  />
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {company.adoptionStatus.timeline.map((signal) => (
                  <div key={signal.label} className="rounded-[18px] bg-white p-4">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      {signal.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {signal.reached ? signal.dateLabel || "Reached" : "Not yet"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Recovery follow-up
            </p>
            <div className="rounded-[22px] bg-[var(--color-surface)] p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={`${company.adoptionFollowUpSummary.openCount} open follow-up${company.adoptionFollowUpSummary.openCount === 1 ? "" : "s"}`}
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
                  <StatusBadge label="Stalled with no action" tone="danger" />
                ) : null}
              </div>
              <CompanyAdoptionFollowUpPanel
                companyId={company.id}
                companyName={company.name}
                createPath={`/api/workspace/${companySlug}/company-structure/adoption-follow-ups`}
                updatePathBase={`/api/workspace/${companySlug}/company-structure/adoption-follow-ups`}
                followUps={company.adoptionFollowUps}
                ownerOptions={company.ownerOptions}
                recommendations={company.adoptionStatus.recommendations}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Subsidiary companies
            </p>
            {company.childCompanies.length > 0 ? (
              company.childCompanies.map((child) => (
                <div key={child.id} className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">{child.name}</p>
                    <StatusBadge label={child.companyTypeLabel} tone="accent" />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
                No child companies are linked to this workspace yet.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Create a group
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Start a shared group structure
              </h2>
            </div>
            <form className="space-y-4" onSubmit={handleCreateGroup}>
              <TextField
                label="Group name"
                name="groupName"
                placeholder="Northstar Group"
                required
              />
              {groupError ? (
                <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  {groupError}
                </div>
              ) : null}
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create group"}
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Update structure
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Define how this company fits
              </h2>
            </div>
            <form className="space-y-4" onSubmit={handleUpdateStructure}>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Company IBAN"
                  name="bankIban"
                  defaultValue={company.bankIban ?? ""}
                />
                <TextField
                  label="Company BIC"
                  name="bankBic"
                  defaultValue={company.bankBic ?? ""}
                />
                <SelectField
                  label="Payroll bank file"
                  name="bankExportProfile"
                  defaultValue={company.bankExportProfile}
                  options={bankFileExportProfileOptions}
                />
              </div>
              <SelectField
                label="Legal form"
                name="legalForm"
                defaultValue={company.legalFormValue}
                options={legalFormOptions}
              />

              {company.supportsGroupStructure ? (
                <>
              <SelectField
                label="Business group"
                name="groupId"
                defaultValue={company.group?.id ?? ""}
                options={[
                  { label: "No group (standalone)", value: "" },
                  ...groups.map((group) => ({
                    label: group.name,
                    value: group.id,
                  })),
                ]}
              />
              <SelectField
                label="Company type"
                name="companyType"
                defaultValue={company.companyTypeValue}
                options={companyTypeOptions}
              />
              <SelectField
                label="Parent company"
                name="parentCompanyId"
                defaultValue={company.parentCompany?.id ?? ""}
                options={[
                  { label: "No parent company", value: "" },
                  ...companyOptions,
                ]}
              />
              <label className="flex items-start gap-3 rounded-[22px] bg-[var(--color-surface)] p-4">
                <input
                  type="checkbox"
                  name="isHoldingCompany"
                  defaultChecked={company.isHoldingCompany}
                  className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-[var(--color-foreground)]">
                    Mark as holding company
                  </span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    Useful when this company mainly sits above other companies in the group.
                  </span>
                </span>
              </label>
                </>
              ) : (
                <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  Enskild firma is treated as a standalone legal form for now, so group and holding structure options stay hidden to keep the setup clear.
                </div>
              )}

              {error ? (
                <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  {error}
                </div>
              ) : null}

              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save company structure"}
              </Button>
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
}
