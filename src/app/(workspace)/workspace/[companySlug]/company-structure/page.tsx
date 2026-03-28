import { CompanyStructurePage } from "@/components/company/company-structure-page";
import { getRoleLabel, requireCompanyStructureAccess } from "@/lib/access";
import { getCompanyAdoptionSignals } from "@/lib/company-adoption";
import {
  getAdoptionFollowUpSummary,
  getComputedReviewStatus,
  getOutcomeRecommendation,
  getReviewRecommendation,
} from "@/lib/company-adoption-followups";
import { getRoleCounts, getStarterReadiness } from "@/lib/company-starter";
import {
  bankFileExportProfileOptions,
  companyTypeOptions,
  getCompanyTypeLabel,
  getLegalFormLabel,
  supportsGroupStructure,
} from "@/lib/company-structure";
import { legalFormOptions } from "@/lib/company";
import { prisma } from "@/lib/prisma";

export default async function CompanyStructureWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireCompanyStructureAccess(companySlug);

  const [company, groups, companies] = await Promise.all([
    prisma.company.findFirst({
      where: {
        id: viewer.company.id,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        parentCompany: {
          select: {
            id: true,
            name: true,
            companyType: true,
          },
        },
        childCompanies: {
          select: {
            id: true,
            name: true,
            companyType: true,
          },
          orderBy: {
            name: "asc",
          },
        },
        workspaceManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
        },
        projects: {
          select: {
            createdAt: true,
            kickoffCompletedAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        tasks: {
          select: {
            status: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: "asc",
          },
        },
        timeEntries: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        adoptionFollowUps: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            lastReviewedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            outcomeRecordedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        },
      },
    }),
    prisma.businessGroup.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.company.findMany({
      where: {
        id: {
          not: viewer.company.id,
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        companyType: true,
      },
    }),
  ]);

  if (!company) {
    throw new Error("Company not found.");
  }

  const roleCounts = getRoleCounts(company.memberships.map((membership) => membership.role));
  const starterReadiness = getStarterReadiness({
    ownerAdminCount: roleCounts.ownerAdminCount,
    managerAssigned: Boolean(company.workspaceManagerId),
    memberCount: company.memberships.length,
    employeeCount: roleCounts.employeeCount,
  });
  const firstKickoffCompletedProject = company.projects
    .filter((project) => project.kickoffCompletedAt)
    .sort((a, b) => a.kickoffCompletedAt!.getTime() - b.kickoffCompletedAt!.getTime())[0];
  const firstStartedTask = company.tasks
    .filter((task) => task.status === "IN_PROGRESS" || task.status === "DONE")
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())[0];
  const firstTimeEntry = company.timeEntries
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  const adoptionFollowUpSummary = getAdoptionFollowUpSummary(company.adoptionFollowUps);
  const adoptionStatus = getCompanyAdoptionSignals({
    companyCreatedAt: company.createdAt,
    memberships: company.memberships.map((membership) => ({
      role: membership.role,
      user: {
        status: membership.user.status,
      },
    })),
    firstProjectCreatedAt: company.projects[0]?.createdAt ?? null,
    firstTaskStartedAt: firstStartedTask?.updatedAt ?? null,
    firstTimeEntryAt: firstTimeEntry?.createdAt ?? null,
    firstKickoffCompletedAt: firstKickoffCompletedProject?.kickoffCompletedAt ?? null,
    latestProjectActivityAt: company.projects[company.projects.length - 1]?.createdAt ?? null,
    latestTaskActivityAt: company.tasks[company.tasks.length - 1]?.updatedAt ?? null,
    latestTimeEntryAt: company.timeEntries[company.timeEntries.length - 1]?.createdAt ?? null,
    latestKickoffCompletedAt:
      [...company.projects]
        .filter((project) => project.kickoffCompletedAt)
        .sort((a, b) => a.kickoffCompletedAt!.getTime() - b.kickoffCompletedAt!.getTime())
        .pop()?.kickoffCompletedAt ?? null,
    openFollowUpCount: adoptionFollowUpSummary.openCount,
    overdueFollowUpCount: adoptionFollowUpSummary.overdueCount,
  });

  return (
    <CompanyStructurePage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      company={{
        id: company.id,
        name: company.name,
        organizationNumber: company.organizationNumber,
        bankIban: company.bankIban,
        bankBic: company.bankBic,
        bankExportProfile: company.bankExportProfile,
        legalFormLabel: getLegalFormLabel(company.legalForm),
        legalFormValue: company.legalForm,
        companyTypeLabel: getCompanyTypeLabel(company.companyType),
        companyTypeValue: company.companyType,
        isHoldingCompany: company.isHoldingCompany,
        supportsGroupStructure: supportsGroupStructure(company.legalForm),
        group: company.group,
        workspaceManager: company.workspaceManager
          ? {
              id: company.workspaceManager.id,
              name: company.workspaceManager.name,
              email: company.workspaceManager.email,
            }
          : null,
        starterSetupNote: company.starterSetupNote,
        starterReadiness,
        adoptionStatus,
        adoptionFollowUpSummary,
        adoptionFollowUps: company.adoptionFollowUps.map((followUp) => {
          const reviewStatus = getComputedReviewStatus({
            status: followUp.status,
            reviewByDate: followUp.reviewByDate,
            lastReviewedAt: followUp.lastReviewedAt,
          });

          return {
            id: followUp.id,
            title: followUp.title,
            description: followUp.description,
            ownerId: followUp.ownerId,
            ownerName: followUp.owner?.name ?? null,
            ownerEmail: followUp.owner?.email ?? null,
            dueDate: followUp.dueDate?.toISOString() ?? null,
            reviewByDate: followUp.reviewByDate?.toISOString() ?? null,
            lastReviewedAt: followUp.lastReviewedAt?.toISOString() ?? null,
            lastReviewedByUserId: followUp.lastReviewedByUserId,
            lastReviewedByName: followUp.lastReviewedBy?.name ?? null,
            reviewStatus,
            reviewNote: followUp.reviewNote,
            reviewRecommendation: getReviewRecommendation({
              status: followUp.status,
              reviewStatus,
              lastReviewedAt: followUp.lastReviewedAt,
            }),
            outcomeStatus: followUp.outcomeStatus,
            outcomeSummary: followUp.outcomeSummary,
            outcomeRecordedAt: followUp.outcomeRecordedAt?.toISOString() ?? null,
            outcomeRecordedByUserId: followUp.outcomeRecordedByUserId,
            outcomeRecordedByName: followUp.outcomeRecordedBy?.name ?? null,
            outcomeRecommendation: getOutcomeRecommendation({
              outcomeStatus: followUp.outcomeStatus,
              status: followUp.status,
              adoptionStatusValue: adoptionStatus.value,
            }),
            status: followUp.status,
            priority: followUp.priority,
            completedAt: followUp.completedAt?.toISOString() ?? null,
            updatedAt: followUp.updatedAt.toISOString(),
            createdAt: followUp.createdAt.toISOString(),
          };
        }),
        teamSummary: {
          memberCount: company.memberships.length,
          ownerAdminCount: roleCounts.ownerAdminCount,
          employeeCount: roleCounts.employeeCount,
        },
        ownerOptions: company.memberships.map((membership) => ({
          value: membership.user.id,
          label: `${membership.user.name} - ${getRoleLabel(membership.role)}`,
        })),
        parentCompany: company.parentCompany
          ? {
              id: company.parentCompany.id,
              name: company.parentCompany.name,
              companyTypeLabel: getCompanyTypeLabel(company.parentCompany.companyType),
            }
          : null,
        childCompanies: company.childCompanies.map((child) => ({
          id: child.id,
          name: child.name,
          companyTypeLabel: getCompanyTypeLabel(child.companyType),
        })),
      }}
      groups={groups}
      companyOptions={companies.map((item) => ({
        label: `${item.name} - ${getCompanyTypeLabel(item.companyType)}`,
        value: item.id,
      }))}
      companyTypeOptions={companyTypeOptions}
      bankFileExportProfileOptions={bankFileExportProfileOptions}
      legalFormOptions={legalFormOptions}
    />
  );
}
