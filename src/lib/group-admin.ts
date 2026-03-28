import { CompanyType, LegalForm, UserRole } from "@prisma/client";
import { z } from "zod";
import { getRoleLabel } from "@/lib/access";
import { getCompanyAdoptionSignals } from "@/lib/company-adoption";
import {
  getAdoptionFollowUpSummary,
  getComputedReviewStatus,
  getOutcomeRecommendation,
  getReviewRecommendation,
} from "@/lib/company-adoption-followups";
import {
  getCompanyTypeLabel,
  getLegalFormLabel,
} from "@/lib/company-structure";
import { supportsCorporateStructure } from "@/lib/company";
import { getRoleCounts, getStarterReadiness } from "@/lib/company-starter";
import { prisma } from "@/lib/prisma";

export const updateGroupCompanySchema = z.object({
  companyType: z.nativeEnum(CompanyType),
  parentCompanyId: z.string().optional().transform((value) => value || ""),
  isHoldingCompany: z.coerce.boolean().optional().default(false),
});

export const attachCompanyToGroupSchema = z.object({
  companyId: z.string().min(1),
  companyType: z.nativeEnum(CompanyType).optional().default("OPERATING"),
});

export const upsertGroupMembershipSchema = z.object({
  companyId: z.string().min(1),
  role: z.nativeEnum(UserRole),
});

export const updateGroupPrimaryCompanySchema = z.object({
  companyId: z.string().min(1),
});

export const createGroupCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(50),
  organizationNumber: z.string().trim().min(6).max(30),
  legalForm: z.nativeEnum(LegalForm),
  companyType: z.nativeEnum(CompanyType),
  parentCompanyId: z.string().optional().transform((value) => value || ""),
});

export function getAccessCoverageLabel(companyCount: number) {
  if (companyCount <= 1) {
    return "Single-company access";
  }

  return `${companyCount} companies`;
}

export function getCompanySetupState(input: {
  ownerAdminCount: number;
  memberCount: number;
  managerAssigned?: boolean;
  employeeCount?: number;
}) {
  if (input.managerAssigned !== undefined || input.employeeCount !== undefined) {
    return getStarterReadiness({
      ownerAdminCount: input.ownerAdminCount,
      managerAssigned: input.managerAssigned ?? false,
      memberCount: input.memberCount,
      employeeCount: input.employeeCount ?? 0,
    });
  }

  if (input.ownerAdminCount === 0) {
    return {
      value: "ADMIN_MISSING",
      label: "Admin missing",
      tone: "danger" as const,
      description: "Add an owner or admin so the company can be managed safely.",
      recommendations: [
        {
          label: "No owner or admin is assigned yet",
          tone: "danger" as const,
        },
      ],
    };
  }

  if (input.memberCount <= 1) {
    return {
      value: "SETUP_NEEDED",
      label: "Setup needed",
      tone: "accent" as const,
      description:
        "The company exists, but it still needs more than one active person to feel operational.",
      recommendations: [
        {
          label: "Only one member has access so far",
          tone: "accent" as const,
        },
      ],
    };
  }

  return {
    value: "READY",
    label: "Ready",
    tone: "success" as const,
    description: "The company has admin coverage and an initial team in place.",
    recommendations: [
      {
        label: "Starter setup looks healthy",
        tone: "success" as const,
      },
    ],
  };
}

export function getUserStatusLabel(status: "ACTIVE" | "INVITED" | "INACTIVE") {
  if (status === "ACTIVE") {
    return "Active";
  }

  if (status === "INVITED") {
    return "Invited";
  }

  return "Inactive";
}

export function getNormalizedCompanyPlacement(input: {
  legalForm: LegalForm;
  companyType: CompanyType;
  parentCompanyId?: string;
}) {
  if (!supportsCorporateStructure(input.legalForm)) {
    return {
      companyType: "OPERATING" as CompanyType,
      parentCompanyId: null,
      isHoldingCompany: false,
    };
  }

  return {
    companyType: input.companyType,
    parentCompanyId: input.parentCompanyId || null,
    isHoldingCompany: input.companyType === "HOLDING",
  };
}

export async function getGroupContextByCompanyId(companyId: string) {
  return prisma.company.findUnique({
    where: {
      id: companyId,
    },
    select: {
      id: true,
      name: true,
      group: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function getGroupAdminSnapshot(groupId: string, currentCompanyId: string) {
  const [group, companies, members, outsideCompanies] = await Promise.all([
    prisma.businessGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.company.findMany({
      where: {
        groupId,
      },
      orderBy: [{ isHoldingCompany: "desc" }, { name: "asc" }],
      include: {
        workspaceManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parentCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        childCompanies: {
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        },
        _count: {
          select: {
            memberships: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
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
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
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
        },
      },
    }),
    prisma.user.findMany({
      where: {
        companyMemberships: {
          some: {
            company: {
              groupId,
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        companyId: true,
        companyMemberships: {
          where: {
            company: {
              groupId,
            },
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                group: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [{ company: { name: "asc" } }],
        },
      },
    }),
    prisma.company.findMany({
      where: {
        OR: [{ groupId: null }, { groupId }],
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        groupId: true,
      },
    }),
  ]);

  const companyIds = new Set(companies.map((company) => company.id));
  const eligibleAttachCompanies = outsideCompanies.filter(
    (company) => !company.groupId || company.groupId === groupId,
  );

  const summary = {
    companyCount: companies.length,
    memberCount: members.length,
    holdingCount: companies.filter((company) => company.companyType === "HOLDING").length,
    sharedMembersCount: members.filter((member) => member.companyMemberships.length > 1).length,
  };

  return {
    group,
    summary,
    companies: companies.map((company) => {
      const roleCounts = getRoleCounts(company.memberships.map((membership) => membership.role));
      const firstKickoffCompletedProject = company.projects.find(
        (project) => project.kickoffCompletedAt,
      );
      const firstStartedTask = company.tasks.find(
        (task) => task.status === "IN_PROGRESS" || task.status === "DONE",
      );
      const latestProjectActivity = company.projects[company.projects.length - 1];
      const latestTaskActivity = company.tasks[company.tasks.length - 1];
      const latestTimeEntry = company.timeEntries[company.timeEntries.length - 1];
      const adoptionFollowUpSummary = getAdoptionFollowUpSummary(company.adoptionFollowUps);
      const latestKickoffCompletedProject = [...company.projects]
        .filter((project) => project.kickoffCompletedAt)
        .sort((a, b) => a.kickoffCompletedAt!.getTime() - b.kickoffCompletedAt!.getTime())
        .pop();
      const adoptionStatus = getCompanyAdoptionSignals({
        companyCreatedAt: company.createdAt,
        memberships: company.memberships,
        firstProjectCreatedAt: company.projects[0]?.createdAt ?? null,
        firstTaskStartedAt: firstStartedTask?.updatedAt ?? null,
        firstTimeEntryAt: company.timeEntries[0]?.createdAt ?? null,
        firstKickoffCompletedAt: firstKickoffCompletedProject?.kickoffCompletedAt ?? null,
        latestProjectActivityAt: latestProjectActivity?.createdAt ?? null,
        latestTaskActivityAt: latestTaskActivity?.updatedAt ?? null,
        latestTimeEntryAt: latestTimeEntry?.createdAt ?? null,
        latestKickoffCompletedAt: latestKickoffCompletedProject?.kickoffCompletedAt ?? null,
        openFollowUpCount: adoptionFollowUpSummary.openCount,
        overdueFollowUpCount: adoptionFollowUpSummary.overdueCount,
      });
      const setupState = getCompanySetupState({
        ownerAdminCount: roleCounts.ownerAdminCount,
        memberCount: company._count.memberships,
        managerAssigned: Boolean(company.workspaceManagerId),
        employeeCount: roleCounts.employeeCount,
      });

      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        organizationNumber: company.organizationNumber,
        legalFormLabel: getLegalFormLabel(company.legalForm),
        companyTypeValue: company.companyType,
        companyTypeLabel: getCompanyTypeLabel(company.companyType),
        isHoldingCompany: company.isHoldingCompany,
        workspaceManagerId: company.workspaceManagerId,
        workspaceManagerName: company.workspaceManager?.name ?? null,
        workspaceManagerEmail: company.workspaceManager?.email ?? null,
        starterSetupNote: company.starterSetupNote,
        parentCompanyId: company.parentCompanyId,
        parentCompanyName: company.parentCompany?.name ?? null,
        memberCount: company._count.memberships,
        ownerAdminCount: roleCounts.ownerAdminCount,
        employeeCount: roleCounts.employeeCount,
        childCompanies: company.childCompanies.map((child) => child.name),
        isCurrentCompany: company.id === currentCompanyId,
        setupState,
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
        currentMembers: members
          .filter((member) =>
            member.companyMemberships.some((membership) => membership.company.id === company.id),
          )
          .map((member) => {
            const membership = member.companyMemberships.find(
              (entry) => entry.company.id === company.id,
            )!;

            return {
              id: member.id,
              name: member.name,
              email: member.email,
              role: membership.role,
              roleLabel: getRoleLabel(membership.role),
              isPrimaryCompany: member.companyId === company.id,
            };
          }),
      };
    }),
    parentCompanyOptions: companies.map((company) => ({
      label: company.name,
      value: company.id,
    })),
    groupCompanyOptions: companies.map((company) => ({
      label: company.name,
      value: company.id,
    })),
    attachableCompanies: eligibleAttachCompanies
      .filter((company) => !companyIds.has(company.id))
      .map((company) => ({
        label: company.name,
        value: company.id,
      })),
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      status: member.status,
      statusLabel: getUserStatusLabel(member.status),
      primaryCompanyId: member.companyId,
      primaryCompanyName:
        member.companyMemberships.find((membership) => membership.company.id === member.companyId)
          ?.company.name ?? "Outside this group",
      accessCoverageLabel: getAccessCoverageLabel(member.companyMemberships.length),
      companyAccesses: member.companyMemberships.map((membership) => ({
        id: membership.id,
        companyId: membership.company.id,
        companyName: membership.company.name,
        role: membership.role,
        roleLabel: getRoleLabel(membership.role),
        groupName: membership.company.group?.name ?? null,
        isCurrentCompany: membership.company.id === currentCompanyId,
        isPrimaryCompany: membership.company.id === member.companyId,
      })),
    })),
    memberOptions: members.map((member) => ({
      label: `${member.name} - ${member.email}`,
      value: member.id,
    })),
  };
}
