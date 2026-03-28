import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";
import { canManageMembers, getRoleLabel } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const memberCreateRoleOptions = [
  "ADMIN",
  "MANAGER",
  "EMPLOYEE",
] as const satisfies readonly UserRole[];

export const memberManageRoleOptions = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "EMPLOYEE",
] as const satisfies readonly UserRole[];

export const memberStatusLabels: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  INACTIVE: "Inactive",
};

export const createMemberSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  role: z.enum(memberCreateRoleOptions),
});

export const updateMemberSchema = z.object({
  role: z.enum(memberManageRoleOptions).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  defaultDailyCapacityHours: z.coerce.number().min(1).max(24).optional(),
  weeklyCapacityHours: z.coerce.number().min(1).max(168).optional(),
  salaryType: z.enum(["HOURLY", "MONTHLY"]).optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  monthlySalary: z.coerce.number().min(0).optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  employerContributionRate: z.coerce.number().min(0).max(100).optional(),
  bankIban: z.string().trim().max(40).optional(),
});

export function getCreatableRoles() {
  return memberCreateRoleOptions.map((role) => ({
    value: role,
    label: getRoleLabel(role),
  }));
}

export function getManageableRoles() {
  return memberManageRoleOptions.map((role) => ({
    value: role,
    label: getRoleLabel(role),
  }));
}

export function getStatusLabel(status: UserStatus) {
  return memberStatusLabels[status];
}

export function generateTemporaryPassword() {
  return `northstar-${randomBytes(4).toString("hex")}`;
}

export async function createMemberAccess({
  companyId,
  name,
  email,
  role,
}: {
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
}) {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hash(temporaryPassword, 12);

  const user = await prisma.user.create({
    data: {
      companyId,
      name,
      email,
      role,
      status: "INVITED",
      passwordHash,
      defaultDailyCapacityHours: 8,
      companyMemberships: {
        create: {
          companyId,
          role,
        },
      },
    },
  });

  return {
    user,
    temporaryPassword,
  };
}

export async function countActiveOwners(companyId: string) {
  return prisma.companyMembership.count({
    where: {
      companyId,
      role: "OWNER",
      user: {
        status: {
          not: "INACTIVE",
        },
      },
    },
  });
}

export async function assertMemberManagementAllowed({
  actingRole,
  targetUserId,
  companyId,
  nextRole,
  nextStatus,
}: {
  actingRole: UserRole;
  targetUserId: string;
  companyId: string;
  nextRole?: UserRole;
  nextStatus?: UserStatus;
}) {
  if (!canManageMembers(actingRole)) {
    throw new Error("You do not have access to manage members.");
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      companyMemberships: {
        some: {
          companyId,
        },
      },
    },
    include: {
      companyMemberships: {
        where: {
          companyId,
        },
        select: {
          role: true,
        },
        take: 1,
      },
    },
  });

  if (!targetUser) {
    throw new Error("That member could not be found.");
  }

  const currentCompanyRole = targetUser.companyMemberships[0]?.role ?? targetUser.role;

  const removesOwnerRole =
    currentCompanyRole === "OWNER" && nextRole && nextRole !== "OWNER";
  const deactivatesOwner =
    currentCompanyRole === "OWNER" && nextStatus === "INACTIVE";

  if (removesOwnerRole || deactivatesOwner) {
    const ownerCount = await countActiveOwners(companyId);

    if (ownerCount <= 1) {
      throw new Error("The company needs at least one active owner.");
    }
  }

  return targetUser;
}
