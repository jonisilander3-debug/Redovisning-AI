import { UserRole, UserStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WorkspaceViewer = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  roleLabel: string;
  company: {
    id: string;
    name: string;
    slug: string;
    organizationNumber: string;
    companyType?: string;
    groupId?: string | null;
    groupName?: string | null;
    bankExportProfile?: string;
  };
  accessibleCompanies: Array<{
    id: string;
    name: string;
    slug: string;
    organizationNumber?: string;
    companyType?: string;
    groupId?: string | null;
    bankExportProfile?: string;
    role: UserRole;
    roleLabel: string;
    groupName: string | null;
  }>;
  primaryCompanySlug: string;
};

const roleLabels: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export function getRoleLabel(role: UserRole) {
  return roleLabels[role];
}

export function isEmployeeRole(role: UserRole) {
  return role === "EMPLOYEE";
}

export function canViewCompanyWorkspace(role: UserRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function canManageMembers(role: UserRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageGroupAdmin(role: UserRole) {
  return canManageMembers(role);
}

export function canManageCompanyStructure(role: UserRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageProjects(role: UserRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function canViewProjectRisk(role: UserRole) {
  return canManageProjects(role);
}

export function canViewCompanyTime(role: UserRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

async function getWorkspaceViewerBySession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      companyMemberships: {
        include: {
          company: {
            include: {
              group: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const membershipsSource =
    user.companyMemberships.length > 0
      ? user.companyMemberships
      : [
          {
            company: user.company,
            role: user.role,
          },
        ];

  const memberships = membershipsSource.map((membership) => ({
    id: membership.company.id,
    name: membership.company.name,
    slug: membership.company.slug,
    organizationNumber: membership.company.organizationNumber,
    companyType: membership.company.companyType,
    groupId: membership.company.groupId,
    bankExportProfile: membership.company.bankExportProfile,
    role: membership.role,
    roleLabel: getRoleLabel(membership.role),
    groupName: "group" in membership.company ? membership.company.group?.name ?? null : null,
  }));

  const primaryCompany =
    memberships.find((membership) => membership.id === user.companyId) ?? memberships[0];

  if (!primaryCompany) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: primaryCompany.role,
    status: user.status,
    roleLabel: getRoleLabel(primaryCompany.role),
    company: {
      id: primaryCompany.id,
      name: primaryCompany.name,
      slug: primaryCompany.slug,
      organizationNumber: primaryCompany.organizationNumber,
      companyType: primaryCompany.companyType,
      groupId:
        user.companyMemberships.find((membership) => membership.companyId === primaryCompany.id)
          ?.company.groupId ?? user.company.groupId,
      groupName:
        user.companyMemberships.find((membership) => membership.companyId === primaryCompany.id)
          ?.company.group?.name ?? user.company.group?.name ?? null,
      bankExportProfile:
        user.companyMemberships.find((membership) => membership.companyId === primaryCompany.id)
          ?.company.bankExportProfile ?? user.company.bankExportProfile,
    },
    accessibleCompanies: memberships.map((membership) => ({
      id: membership.id,
      name: membership.name,
      slug: membership.slug,
      organizationNumber: membership.organizationNumber,
      companyType: membership.companyType,
      groupId: membership.groupId,
      bankExportProfile: membership.bankExportProfile,
      role: membership.role,
      roleLabel: membership.roleLabel,
      groupName: membership.groupName,
    })),
    primaryCompanySlug: primaryCompany.slug,
  } satisfies WorkspaceViewer;
}

export async function getWorkspaceSessionState() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: {
        include: {
          group: {
            select: {
              name: true,
            },
          },
        },
      },
      companyMemberships: {
        include: {
          company: {
            include: {
              group: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    primaryCompanySlug: user.company.slug,
    accessibleCompanies: (user.companyMemberships.length > 0
      ? user.companyMemberships
      : [
          {
            company: user.company,
            role: user.role,
          },
        ]
    ).map((membership) => ({
      id: membership.company.id,
      name: membership.company.name,
      slug: membership.company.slug,
      role: membership.role,
      roleLabel: getRoleLabel(membership.role),
      groupName: "group" in membership.company ? membership.company.group?.name ?? null : null,
    })),
  };
}

export async function requireWorkspaceAccess(
  requestedCompanySlug: string,
): Promise<WorkspaceViewer> {
  const baseViewer = await getWorkspaceViewerBySession();

  if (!baseViewer) {
    redirect("/login");
  }

  const activeMembership = baseViewer.accessibleCompanies.find(
    (company) => company.slug === requestedCompanySlug,
  );

  if (!activeMembership) {
    const redirectCompany = baseViewer.accessibleCompanies[0];

    redirect(`/workspace/${redirectCompany.slug}`);
  }

  return {
    ...baseViewer,
    role: activeMembership.role,
    roleLabel: activeMembership.roleLabel,
    company: {
      ...baseViewer.company,
      id: activeMembership.id,
      name: activeMembership.name,
      slug: activeMembership.slug,
      organizationNumber:
        activeMembership.organizationNumber ?? baseViewer.company.organizationNumber,
      companyType: activeMembership.companyType ?? baseViewer.company.companyType,
      groupId: activeMembership.groupId ?? baseViewer.company.groupId ?? null,
      groupName: activeMembership.groupName ?? baseViewer.company.groupName ?? null,
      bankExportProfile:
        activeMembership.bankExportProfile ?? baseViewer.company.bankExportProfile,
    },
  };
}

export async function requireMemberManagementAccess(
  requestedCompanySlug: string,
) {
  const viewer = await requireWorkspaceAccess(requestedCompanySlug);

  if (!canManageMembers(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}`);
  }

  return viewer;
}

export async function requireCompanyTimeAccess(requestedCompanySlug: string) {
  const viewer = await requireWorkspaceAccess(requestedCompanySlug);

  if (!canViewCompanyTime(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}`);
  }

  return viewer;
}

export async function requireProjectManagementAccess(
  requestedCompanySlug: string,
) {
  const viewer = await requireWorkspaceAccess(requestedCompanySlug);

  if (!canManageProjects(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}`);
  }

  return viewer;
}

export async function requireProjectRiskAccess(requestedCompanySlug: string) {
  const viewer = await requireWorkspaceAccess(requestedCompanySlug);

  if (!canViewProjectRisk(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}`);
  }

  return viewer;
}

export async function requireCompanyStructureAccess(requestedCompanySlug: string) {
  const viewer = await requireWorkspaceAccess(requestedCompanySlug);

  if (!canManageCompanyStructure(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}`);
  }

  return viewer;
}

export async function requireGroupAdminAccess(requestedCompanySlug: string) {
  const viewer = await requireWorkspaceAccess(requestedCompanySlug);

  if (!canManageGroupAdmin(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}`);
  }

  const companyWithGroup = await prisma.company.findUnique({
    where: {
      id: viewer.company.id,
    },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!companyWithGroup?.group) {
    redirect(`/workspace/${viewer.company.slug}/company-structure`);
  }

  return {
    ...viewer,
    company: {
      ...viewer.company,
      groupId: companyWithGroup.group.id,
      groupName: companyWithGroup.group.name,
    },
  };
}

export async function getCurrentWorkspaceViewer(requestedCompanySlug: string) {
  const viewer = await getWorkspaceViewerBySession();

  if (!viewer) {
    return null;
  }

  const activeMembership = viewer.accessibleCompanies.find(
    (company) => company.slug === requestedCompanySlug,
  );

  if (!activeMembership) {
    return null;
  }

  return {
    ...viewer,
    role: activeMembership.role,
    roleLabel: activeMembership.roleLabel,
    company: {
      ...viewer.company,
      id: activeMembership.id,
      name: activeMembership.name,
      slug: activeMembership.slug,
      organizationNumber:
        activeMembership.organizationNumber ?? viewer.company.organizationNumber,
      companyType: activeMembership.companyType ?? viewer.company.companyType,
      groupId: activeMembership.groupId ?? viewer.company.groupId ?? null,
      groupName: activeMembership.groupName ?? viewer.company.groupName ?? null,
    },
  };
}
