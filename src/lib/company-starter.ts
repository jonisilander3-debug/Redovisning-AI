import { UserRole } from "@prisma/client";

export function getStarterRecommendationList(input: {
  ownerAdminCount: number;
  managerAssigned: boolean;
  memberCount: number;
  employeeCount: number;
}) {
  const recommendations: Array<{
    label: string;
    tone: "danger" | "accent" | "success";
  }> = [];

  if (input.ownerAdminCount === 0) {
    recommendations.push({
      label: "No owner or admin is assigned yet",
      tone: "danger",
    });
  }

  if (!input.managerAssigned) {
    recommendations.push({
      label: "No default workspace manager is assigned",
      tone: "accent",
    });
  }

  if (input.memberCount <= 1) {
    recommendations.push({
      label: "Only one member has access so far",
      tone: "accent",
    });
  }

  if (input.employeeCount === 0) {
    recommendations.push({
      label: "No employee access is in place yet",
      tone: "accent",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      label: "Starter setup looks healthy",
      tone: "success",
    });
  }

  return recommendations;
}

export function getStarterReadiness(input: {
  ownerAdminCount: number;
  managerAssigned: boolean;
  memberCount: number;
  employeeCount: number;
}) {
  const recommendations = getStarterRecommendationList(input);

  if (input.ownerAdminCount === 0) {
    return {
      value: "CRITICAL",
      label: "Critical setup missing",
      tone: "danger" as const,
      description: "Add an owner or admin before handing this company over.",
      recommendations,
    };
  }

  if (!input.managerAssigned || input.memberCount <= 1) {
    return {
      value: "SETUP_NEEDED",
      label: "Starter setup needed",
      tone: "accent" as const,
      description: "The company is usable, but it still needs clearer operational ownership.",
      recommendations,
    };
  }

  return {
    value: "READY",
    label: "Starter ready",
    tone: "success" as const,
    description: "A lead, admin coverage, and an initial team are in place.",
    recommendations,
  };
}

export function getRoleCounts(roles: UserRole[]) {
  const ownerAdminCount = roles.filter((role) => role === "OWNER" || role === "ADMIN").length;
  const employeeCount = roles.filter((role) => role === "EMPLOYEE").length;
  const managerCount = roles.filter((role) => role === "MANAGER").length;

  return {
    ownerAdminCount,
    employeeCount,
    managerCount,
  };
}
