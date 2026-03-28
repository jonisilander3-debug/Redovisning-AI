import { UserRole, UserStatus } from "@prisma/client";

type AdoptionSignalsInput = {
  companyCreatedAt: Date;
  activeAdminExists: boolean;
  activeTeamMemberExists: boolean;
  firstProjectCreatedAt: Date | null;
  firstTaskStartedAt: Date | null;
  firstTimeEntryAt: Date | null;
  firstKickoffCompletedAt: Date | null;
  latestProjectActivityAt: Date | null;
  latestTaskActivityAt: Date | null;
  latestTimeEntryAt: Date | null;
  latestKickoffCompletedAt: Date | null;
  openFollowUpCount?: number;
  overdueFollowUpCount?: number;
};

function daysSince(value: Date, now: Date) {
  return Math.floor((now.getTime() - value.getTime()) / (1000 * 60 * 60 * 24));
}

function getLatestActivityDate(input: AdoptionSignalsInput) {
  const dates = [
    input.latestProjectActivityAt,
    input.latestTaskActivityAt,
    input.latestTimeEntryAt,
    input.latestKickoffCompletedAt,
    input.firstProjectCreatedAt,
    input.firstTaskStartedAt,
    input.firstTimeEntryAt,
    input.firstKickoffCompletedAt,
  ].filter((value): value is Date => Boolean(value));

  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.max(...dates.map((value) => value.getTime())));
}

function getStalledStep(input: AdoptionSignalsInput) {
  if (!input.firstProjectCreatedAt) {
    return "The company is ready, but the first project has not been created.";
  }

  if (input.firstProjectCreatedAt && !input.firstTaskStartedAt) {
    return "Project exists but work has not started";
  }

  if (input.firstTaskStartedAt && !input.firstTimeEntryAt) {
    return "Tasks have started, but no time is tracked yet";
  }

  if (input.firstProjectCreatedAt && !input.firstKickoffCompletedAt) {
    return "Project exists, but kickoff has not been completed";
  }

  if (!input.activeTeamMemberExists) {
    return "Only admin-level activity is visible so far";
  }

  return "Momentum has slowed after the first setup steps";
}

function getFollowUpState(input: AdoptionSignalsInput) {
  const openFollowUpCount = input.openFollowUpCount ?? 0;
  const overdueFollowUpCount = input.overdueFollowUpCount ?? 0;

  if (overdueFollowUpCount > 0) {
    return {
      label: "Overdue follow-up",
      tone: "danger" as const,
      description: `${overdueFollowUpCount} adoption follow-up ${overdueFollowUpCount === 1 ? "is" : "are"} overdue.`,
    };
  }

  if (openFollowUpCount > 0) {
    return {
      label: "Follow-up in progress",
      tone: "accent" as const,
      description: `${openFollowUpCount} active follow-up ${openFollowUpCount === 1 ? "is" : "are"} assigned.`,
    };
  }

  return {
    label: "No follow-up yet",
    tone: "default" as const,
    description: "No internal recovery action has been assigned yet.",
  };
}

export function formatActivationDate(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function getCompanyAdoptionRecommendations(input: AdoptionSignalsInput) {
  const recommendations: Array<{
    label: string;
    tone: "danger" | "accent" | "success";
  }> = [];

  if (!input.firstProjectCreatedAt) {
    recommendations.push({
      label: "Create the first project",
      tone: "danger",
    });
  }

  if (input.firstProjectCreatedAt && !input.firstTaskStartedAt) {
    recommendations.push({
      label: "Start the first task",
      tone: "accent",
    });
  }

  if (input.firstTaskStartedAt && !input.firstTimeEntryAt) {
    recommendations.push({
      label: "Track first work time",
      tone: "accent",
    });
  }

  if (input.firstProjectCreatedAt && !input.firstKickoffCompletedAt) {
    recommendations.push({
      label: "Complete kickoff",
      tone: "accent",
    });
  }

  if (!input.activeTeamMemberExists) {
    recommendations.push({
      label: "Add an active employee",
      tone: "accent",
    });
  }

  if ((input.openFollowUpCount ?? 0) === 0) {
    recommendations.push({
      label: "Add a follow-up owner and next step",
      tone: "accent",
    });
  }

  if ((input.overdueFollowUpCount ?? 0) > 0) {
    recommendations.push({
      label: "Resolve overdue adoption follow-up",
      tone: "danger",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      label: "Operational momentum looks healthy",
      tone: "success",
    });
  }

  return recommendations;
}

export function getCompanyAdoptionStatus(input: AdoptionSignalsInput) {
  const recommendations = getCompanyAdoptionRecommendations(input);
  const followUpState = getFollowUpState(input);
  const now = new Date();
  const latestActivityAt = getLatestActivityDate(input);
  const companyAgeDays = daysSince(input.companyCreatedAt, now);
  const latestActivityAgeDays = latestActivityAt ? daysSince(latestActivityAt, now) : null;
  const openFollowUpCount = input.openFollowUpCount ?? 0;
  const overdueFollowUpCount = input.overdueFollowUpCount ?? 0;

  const meaningfulUsageStarted =
    Boolean(input.firstProjectCreatedAt) ||
    Boolean(input.firstTaskStartedAt) ||
    Boolean(input.firstTimeEntryAt);

  const fullyActive =
    Boolean(input.firstProjectCreatedAt) &&
    Boolean(input.firstTaskStartedAt) &&
    Boolean(input.firstTimeEntryAt) &&
    input.activeTeamMemberExists;

  if (!meaningfulUsageStarted) {
    if (companyAgeDays >= 7) {
      return {
        value: "IDLE_AFTER_SETUP",
        label: "Idle after setup",
        tone: openFollowUpCount > 0 ? ("accent" as const) : ("danger" as const),
        description:
          "The company is set up, but real operational usage has not started after the first setup phase.",
        recommendations,
        stalledReason:
          openFollowUpCount > 0
            ? "Setup is complete, but the company still needs a clear first usage step."
            : "Setup is complete, but the company has not moved into real work yet.",
        followUpState,
      };
    }

    return {
      value: "NOT_STARTED",
      label: "Not started",
      tone: "danger" as const,
      description: "The company is set up, but real day-to-day usage has not started yet.",
      recommendations,
      stalledReason: null,
      followUpState,
    };
  }

  if (
    fullyActive &&
    latestActivityAgeDays !== null &&
    latestActivityAgeDays <= 14 &&
    overdueFollowUpCount === 0
  ) {
    return {
      value: "ACTIVE",
      label: "Active",
      tone: "success" as const,
      description: "The company is showing clear signs of real operational usage.",
      recommendations,
      stalledReason: null,
      followUpState,
    };
  }

  if (meaningfulUsageStarted && latestActivityAgeDays !== null && latestActivityAgeDays >= 10) {
    return {
      value: "STALLED_AFTER_START",
      label: "Stalled after start",
      tone:
        openFollowUpCount > 0 && overdueFollowUpCount === 0
          ? ("accent" as const)
          : ("danger" as const),
      description: "The company started using the platform, but momentum has slowed or stopped.",
      recommendations,
      stalledReason: getStalledStep(input),
      followUpState,
    };
  }

  return {
    value: "STARTING",
    label: "Starting",
    tone:
      overdueFollowUpCount > 0
        ? ("danger" as const)
        : ("accent" as const),
    description: "Some early usage is visible, but adoption is still shallow.",
    recommendations,
    stalledReason: getStalledStep(input),
    followUpState,
  };
}

export function getCompanyAdoptionSignals(input: {
  companyCreatedAt: Date;
  memberships: Array<{
    role: UserRole;
    user: {
      status: UserStatus;
    };
  }>;
  firstProjectCreatedAt: Date | null;
  firstTaskStartedAt: Date | null;
  firstTimeEntryAt: Date | null;
  firstKickoffCompletedAt: Date | null;
  latestProjectActivityAt: Date | null;
  latestTaskActivityAt: Date | null;
  latestTimeEntryAt: Date | null;
  latestKickoffCompletedAt: Date | null;
  openFollowUpCount?: number;
  overdueFollowUpCount?: number;
}) {
  const activeAdminExists = input.memberships.some(
    (membership) =>
      (membership.role === "OWNER" || membership.role === "ADMIN") &&
      membership.user.status === "ACTIVE",
  );

  const activeTeamMemberExists = input.memberships.some(
    (membership) =>
      (membership.role === "MANAGER" || membership.role === "EMPLOYEE") &&
      membership.user.status === "ACTIVE",
  );

  const status = getCompanyAdoptionStatus({
    companyCreatedAt: input.companyCreatedAt,
    activeAdminExists,
    activeTeamMemberExists,
    firstProjectCreatedAt: input.firstProjectCreatedAt,
    firstTaskStartedAt: input.firstTaskStartedAt,
    firstTimeEntryAt: input.firstTimeEntryAt,
    firstKickoffCompletedAt: input.firstKickoffCompletedAt,
    latestProjectActivityAt: input.latestProjectActivityAt,
    latestTaskActivityAt: input.latestTaskActivityAt,
    latestTimeEntryAt: input.latestTimeEntryAt,
    latestKickoffCompletedAt: input.latestKickoffCompletedAt,
    openFollowUpCount: input.openFollowUpCount,
    overdueFollowUpCount: input.overdueFollowUpCount,
  });

  const timeline = [
    {
      label: "First admin active",
      reached: activeAdminExists,
      dateLabel: activeAdminExists ? "Active" : null,
    },
    {
      label: "First team member active",
      reached: activeTeamMemberExists,
      dateLabel: activeTeamMemberExists ? "Active" : null,
    },
    {
      label: "First project created",
      reached: Boolean(input.firstProjectCreatedAt),
      dateLabel: formatActivationDate(input.firstProjectCreatedAt),
    },
    {
      label: "First task started",
      reached: Boolean(input.firstTaskStartedAt),
      dateLabel: formatActivationDate(input.firstTaskStartedAt),
    },
    {
      label: "First time entry",
      reached: Boolean(input.firstTimeEntryAt),
      dateLabel: formatActivationDate(input.firstTimeEntryAt),
    },
    {
      label: "First kickoff completed",
      reached: Boolean(input.firstKickoffCompletedAt),
      dateLabel: formatActivationDate(input.firstKickoffCompletedAt),
    },
  ];

  if (status.stalledReason) {
    timeline.push({
      label:
        status.value === "IDLE_AFTER_SETUP"
          ? "Idle after setup"
          : status.value === "STALLED_AFTER_START"
            ? "Stalled after start"
            : "Next step missing",
      reached: false,
      dateLabel: status.stalledReason,
    });
  }

  if ((input.openFollowUpCount ?? 0) > 0 || (input.overdueFollowUpCount ?? 0) > 0) {
    timeline.push({
      label: "Recovery follow-up",
      reached: (input.overdueFollowUpCount ?? 0) === 0,
      dateLabel: status.followUpState.description,
    });
  }

  return {
    ...status,
    timeline,
  };
}
