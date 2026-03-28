import { UserRole, UserStatus } from "@prisma/client";
import { AddMemberForm } from "@/components/members/add-member-form";
import { MemberCompanyAccessPanel } from "@/components/members/member-company-access-panel";
import { MemberRowActions } from "@/components/members/member-row-actions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRoleLabel } from "@/lib/access";
import {
  getCreatableRoles,
  getManageableRoles,
  getStatusLabel,
} from "@/lib/member-management";

type MembersPageProps = {
  companySlug: string;
  companyName: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    defaultDailyCapacityHours: number;
    salaryType: "HOURLY" | "MONTHLY";
    hourlyRate: number | null;
    monthlySalary: number | null;
    taxPercent: number | null;
    employerContributionRate: number | null;
    bankIban: string | null;
    primaryCompanyId: string;
    companyAccesses: Array<{
      id: string;
      companyId: string;
      companyName: string;
      role: UserRole;
      roleLabel: string;
      groupName: string | null;
      isCurrentCompany: boolean;
      isPrimaryCompany: boolean;
    }>;
  }>;
  canManage: boolean;
  availableCompanies: Array<{
    label: string;
    value: string;
  }>;
};

function getStatusTone(status: UserStatus) {
  if (status === "ACTIVE") {
    return "success" as const;
  }

  if (status === "INACTIVE") {
    return "danger" as const;
  }

  return "accent" as const;
}

export function MembersPage({
  companySlug,
  companyName,
  members,
  canManage,
  availableCompanies,
}: MembersPageProps) {
  const createRoleOptions = getCreatableRoles();
  const manageRoleOptions = getManageableRoles();

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Members"
        title="Manage the people in your workspace"
        description={`${companyName} can now keep member access, roles, and future portal separation in one calm place.`}
      />

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Company members
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Everyone with access
            </h2>
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)]">
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
                      <StatusBadge label={getRoleLabel(member.role)} tone="primary" />
                      <StatusBadge
                        label={getStatusLabel(member.status)}
                        tone={getStatusTone(member.status)}
                      />
                    </div>
                  </div>

                  <MemberRowActions
                    companySlug={companySlug}
                    memberId={member.id}
                    role={member.role}
                    status={member.status}
                    defaultDailyCapacityHours={member.defaultDailyCapacityHours}
                    salaryType={member.salaryType}
                    hourlyRate={member.hourlyRate}
                    monthlySalary={member.monthlySalary}
                    taxPercent={member.taxPercent}
                    employerContributionRate={member.employerContributionRate}
                    bankIban={member.bankIban}
                    roleOptions={manageRoleOptions}
                    canEdit={canManage}
                  />

                  {canManage ? (
                    <MemberCompanyAccessPanel
                      companySlug={companySlug}
                      memberId={member.id}
                      accesses={member.companyAccesses.map((access) => ({
                        ...access,
                        role: access.role,
                      }))}
                      availableCompanies={availableCompanies.filter(
                        (company) =>
                          !member.companyAccesses.some(
                            (access) => access.companyId === company.value,
                          ),
                      )}
                      roleOptions={manageRoleOptions}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <AddMemberForm companySlug={companySlug} roleOptions={createRoleOptions} />
      </section>
    </div>
  );
}
