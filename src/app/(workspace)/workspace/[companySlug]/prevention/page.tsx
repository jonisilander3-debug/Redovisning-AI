import { RecurrenceOverviewPage } from "@/components/blockers/recurrence-overview-page";
import { requireProjectRiskAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { detectRecurringBlockerPatterns } from "@/lib/recurrence-prevention";

function formatDate(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function PreventionWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectRiskAccess(companySlug);

  const [blockers, actions, improvements, projects] = await Promise.all([
    prisma.taskBlocker.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        preventiveActions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.preventiveAction.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        sourceBlocker: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.executionImprovement.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        sourcePreventiveAction: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.project.findMany({
      where: {
        companyId: viewer.company.id,
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        title: "asc",
      },
    }),
  ]);

  const patterns = detectRecurringBlockerPatterns(
    blockers.map((blocker) => ({
      id: blocker.id,
      title: blocker.title,
      status: blocker.status,
      severity: blocker.severity,
      createdAt: blocker.createdAt,
      reopenedAt: blocker.reopenedAt,
      outcomeStatus: blocker.outcomeStatus,
      projectId: blocker.projectId,
      projectTitle: blocker.project.title,
      taskId: blocker.taskId,
      taskTitle: blocker.task.title,
      preventiveActions: blocker.preventiveActions,
    })),
  );

  const overdueActions = actions.filter(
    (action) => action.dueDate && action.dueDate < new Date() && action.status !== "DONE",
  ).length;

  return (
    <RecurrenceOverviewPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      summary={{
        recurringPatterns: patterns.length,
        patternsWithoutPrevention: patterns.filter((pattern) => pattern.missingPrevention).length,
        activePreventiveActions: actions.filter((action) => action.status !== "DONE").length,
        overduePreventiveActions: overdueActions,
      }}
      patterns={patterns.map((pattern) => ({
        key: pattern.key,
        normalizedTitle: pattern.normalizedTitle,
        projectId: pattern.projectId,
        projectTitle: pattern.projectTitle,
        count: pattern.count,
        reopenedCount: pattern.reopenedCount,
        highSeverityCount: pattern.highSeverityCount,
        activePreventiveActions: pattern.activePreventiveActions,
        donePreventiveActions: pattern.donePreventiveActions,
        missingPrevention: pattern.missingPrevention,
        latestBlockers: pattern.blockers.map((blocker) => ({
          id: blocker.id,
          title: blocker.title,
          severity: blocker.severity,
          taskTitle: blocker.taskTitle,
          createdAt: formatDate(blocker.createdAt) ?? "",
        })),
      }))}
      actions={actions.map((action) => ({
        id: action.id,
        title: action.title,
        status: action.status,
        dueDate: formatDate(action.dueDate),
        projectId: action.project?.id ?? null,
        projectTitle: action.project?.title ?? null,
        ownerName: action.owner?.name ?? null,
        sourceBlockerTitle: action.sourceBlocker?.title ?? null,
        overdue: Boolean(action.dueDate && action.dueDate < new Date() && action.status !== "DONE"),
      }))}
      improvements={improvements.map((improvement) => ({
        id: improvement.id,
        title: improvement.title,
        description: improvement.description,
        status: improvement.status,
        targetType: improvement.targetType,
        appliesToFutureTasks: improvement.appliesToFutureTasks,
        projectTitle: improvement.project?.title ?? null,
        sourcePreventiveActionTitle: improvement.sourcePreventiveAction?.title ?? null,
      }))}
      projectOptions={projects.map((project) => ({
        label: project.title,
        value: project.id,
      }))}
      preventiveActionOptions={actions.map((action) => ({
        label: action.title,
        value: action.id,
      }))}
    />
  );
}
