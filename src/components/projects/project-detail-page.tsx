import {
  ProjectKickoffStatus,
  BlockerOutcomeStatus,
  BlockerFollowUpStatus,
  BlockerSeverity,
  BlockerStatus,
  ChecklistItemStatus,
  ProjectStatus,
  TaskNoteType,
  TaskPriority,
  TaskStatus,
  TaskTimelineEventType,
  TimeEntryStatus,
  UserRole,
} from "@prisma/client";
import { ChecklistItemForm } from "@/components/checklist/checklist-item-form";
import { TaskBlockerPanel } from "@/components/blockers/task-blocker-panel";
import { MaterialEntryForm } from "@/components/materials/material-entry-form";
import { ProjectBillingPanel } from "@/components/projects/project-billing-panel";
import { ProjectKickoffPanel } from "@/components/projects/project-kickoff-panel";
import { ProjectDeliveryTimeline } from "@/components/projects/project-delivery-timeline";
import { ChecklistList } from "@/components/checklist/checklist-list";
import { ProjectForm } from "@/components/projects/project-form";
import { TaskActivityPanel } from "@/components/tasks/task-activity-panel";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskTimelinePanel } from "@/components/tasks/task-timeline-panel";
import { TaskForm } from "@/components/tasks/task-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  checklistStatusOptions,
  getChecklistProgress,
} from "@/lib/checklist-management";
import { getRoleLabel } from "@/lib/access";
import {
  getBlockerSeverityLabel,
  getBlockerSeverityTone,
  getBlockerStatusLabel,
  getBlockerStatusTone,
} from "@/lib/blockers";
import { getProjectDeliverySummary, getProjectDeliveryTimeline } from "@/lib/project-delivery";
import {
  getEarlyPhaseHealthLabel,
  getEarlyPhaseHealthTone,
  getProjectEarlyPhaseSummary,
} from "@/lib/project-early-phase";
import {
  getKickoffSummary,
  getProjectActivityEventLabel,
  getProjectActivityEventTone,
} from "@/lib/project-launch";
import { getProjectRiskLabel, getProjectRiskSummary, getProjectRiskTone } from "@/lib/project-risk";
import {
  getProjectKickoffLabel,
  getProjectKickoffTone,
  getProjectReadinessSummary,
} from "@/lib/project-kickoff";
import {
  detectRecurringBlockerPatterns,
  getPreventiveActionStatusLabel,
  getPreventiveActionStatusTone,
} from "@/lib/recurrence-prevention";
import { getTaskNoteSummary } from "@/lib/task-notes";
import { getTaskTimelineEventLabel, getTaskTimelineEventTone } from "@/lib/task-timeline";
import {
  getProjectStatusLabel,
  getProjectStatusTone,
  projectStatusOptions,
} from "@/lib/project-management";
import {
  getPlanningWindowLabel,
  getTaskChecklistProgress,
  isTaskOverdue,
  taskPriorityOptions,
  taskStatusOptions,
} from "@/lib/task-management";
import {
  getExecutionImprovementStatusLabel,
  getExecutionImprovementStatusTone,
  getExecutionImprovementTargetLabel,
} from "@/lib/execution-improvements";
import {
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
} from "@/lib/invoicing";
import {
  formatDateLabel,
  formatDuration,
  formatTimeLabel,
  getTimeStatusLabel,
  getTimeStatusTone,
} from "@/lib/time-tracking";

type ProjectDetailPageProps = {
  companySlug: string;
  canManage: boolean;
  viewerRole: UserRole;
  project: {
    id: string;
    customerId?: string | null;
    quoteId?: string | null;
    customerName: string;
    title: string;
    description: string | null;
    status: ProjectStatus;
    commercialBasisType: "QUOTE" | "MANUAL" | "RUNNING_WORK";
    budgetNet: string | null;
    budgetGross: string | null;
    budgetLaborValue: string | null;
    budgetMaterialValue: string | null;
    startDate: Date | null;
    endDate: Date | null;
    location: string | null;
    kickoffStatus: ProjectKickoffStatus;
    kickoffCompletedAt: Date | null;
    kickoffNotes: string | null;
    kickoffCompletedBy: {
      id: string;
      name: string;
      email: string;
    } | null;
    kickoffFocusTasks: Array<{
      sortOrder: number;
      task: {
        id: string;
        title: string;
        status: TaskStatus;
        assignedUser: {
          id: string;
          name: string;
          email: string;
        } | null;
      };
    }>;
    activityEvents: Array<{
      id: string;
      type: "KICKOFF_COMPLETED";
      title: string;
      description: string | null;
      createdAt: Date;
      user: {
        id: string;
        name: string;
        email: string;
      } | null;
    }>;
    assignments: Array<{
      user: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
      };
    }>;
    tasks: Array<{
      id: string;
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      plannedStartDate: Date | null;
      plannedEndDate: Date | null;
      dueDate: Date | null;
      createdAt: Date;
      updatedAt: Date;
      assignedUser: {
        id: string;
        name: string;
        email: string;
      } | null;
      assignedUserId?: string | null;
      checklistItems: Array<{
        id: string;
        title: string;
        description: string | null;
        status: ChecklistItemStatus;
        sortOrder: number;
        completedAt: Date | null;
        updatedAt: Date;
        sourceExecutionImprovementId?: string | null;
        assignedUser: {
          id: string;
          name: string;
          email: string;
        } | null;
      }>;
      taskNotes: Array<{
        id: string;
        type: TaskNoteType;
        content: string;
        createdAt: Date;
        user: {
          id: string;
          name: string;
          email: string;
        };
      }>;
      timelineEvents: Array<{
        id: string;
        type: TaskTimelineEventType;
        title: string;
        description: string | null;
        createdAt: Date;
        user: {
          id: string;
          name: string;
          email: string;
        } | null;
      }>;
      blockers: Array<{
        id: string;
        title: string;
        description: string;
        status: BlockerStatus;
        severity: BlockerSeverity;
        followUpAction: string | null;
        followUpOwner: {
          id: string;
          name: string;
          email: string;
        } | null;
        followUpDate: Date | null;
        followUpStatus: BlockerFollowUpStatus | null;
        lastFollowUpAt: Date | null;
        outcomeStatus: BlockerOutcomeStatus;
        outcomeSummary: string | null;
        verifiedAt: Date | null;
        reopenedAt: Date | null;
        reopenReason: string | null;
        resolutionNote: string | null;
        createdAt: Date;
        updatedAt: Date;
        resolvedAt: Date | null;
        user: {
          id: string;
          name: string;
          email: string;
        };
        verifiedBy: {
          id: string;
          name: string;
          email: string;
        } | null;
        preventiveActions: Array<{
          id: string;
          title: string;
          description: string;
          status: "PROPOSED" | "ACTIVE" | "DONE";
          dueDate: Date | null;
          owner: {
            id: string;
            name: string;
            email: string;
          } | null;
        }>;
      }>;
      preventiveActions: Array<{
        id: string;
        title: string;
        description: string;
        status: "PROPOSED" | "ACTIVE" | "DONE";
        dueDate: Date | null;
        owner: {
          id: string;
          name: string;
          email: string;
        } | null;
        sourceBlocker: {
          id: string;
          title: string;
        } | null;
      }>;
      appliedImprovements: Array<{
        id: string;
        executionImprovement: {
          id: string;
          title: string;
          description: string;
          targetType: "TASK_GUIDANCE" | "CHECKLIST_ITEM";
          status: "PROPOSED" | "APPLIED" | "ARCHIVED";
          sourcePreventiveAction: {
            id: string;
            title: string;
          } | null;
        };
      }>;
      _count: {
        timeEntries: number;
      };
    }>;
    timeEntries: Array<{
      id: string;
      date: Date;
      startTime: Date;
      endTime: Date | null;
      status: TimeEntryStatus;
      isBillable: boolean;
      invoiced: boolean;
      note: string | null;
      task: {
        id: string;
        title: string;
      } | null;
      user: {
        id: string;
        name: string;
        email: string;
      };
    }>;
    projectInvoices: Array<{
      id: string;
      invoiceNumber: string;
      status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
      dueDate: Date;
      totalGross: string;
      paidAmount: string;
    }>;
    linkedQuote: {
      id: string;
      quoteNumber: string;
      status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
      totalGross: string;
    } | null;
    billingSummary: {
      unbilledTimeValue: string;
      unbilledMaterialValue: string;
      totalUnbilledValue: string;
      totalBilledAmount: string;
      totalPaidAmount: string;
      outstandingReceivables: string;
      remainingBillableAmount: string;
      unbilledTimeCount: number;
      unbilledMaterialCount: number;
      invoiceCount: number;
      overdueInvoiceCount: number;
    } | null;
    commercialSummary: {
      agreedGross: string;
      billed: string;
      paid: string;
      unbilled: string;
      outstanding: string;
      derivedProjectValue: string;
      remainingCommercialRoom: string;
      basisLabel: string;
      varianceLabel: string;
      varianceTone: "default" | "primary" | "accent" | "success" | "danger";
      laborBudget: string;
      materialBudget: string;
    } | null;
    billableTimeRows: Array<{
      id: string;
      date: string;
      description: string;
      userName: string;
      hours: string;
      value: string;
    }>;
    billableMaterialRows: Array<{
      id: string;
      date: string;
      description: string;
      quantity: string;
      value: string;
    }>;
    materialEntries: Array<{
      id: string;
      description: string;
      quantity: string;
      unitCost: string;
      unitPrice: string;
      isBillable: boolean;
      invoiced: boolean;
      receiptUrl: string | null;
      createdAt: Date;
      user: {
        id: string;
        name: string;
      };
    }>;
    preventiveActions: Array<{
      id: string;
      title: string;
      description: string;
      status: "PROPOSED" | "ACTIVE" | "DONE";
      dueDate: Date | null;
      owner: {
        id: string;
        name: string;
      } | null;
      relatedTask: {
        id: string;
        title: string;
      } | null;
      sourceBlocker: {
        id: string;
        title: string;
        taskId: string;
      } | null;
    }>;
    executionImprovements: Array<{
      id: string;
      title: string;
      description: string;
      targetType: "TASK_GUIDANCE" | "CHECKLIST_ITEM";
      status: "PROPOSED" | "APPLIED" | "ARCHIVED";
      appliesToFutureTasks: boolean;
      sourcePreventiveAction: {
        id: string;
        title: string;
      } | null;
    }>;
  };
  totalDurationLabel: string;
  teamMembers: Array<{
    id: string;
    name: string;
    roleLabel: string;
  }>;
  taskAssigneeOptions: Array<{
    label: string;
    value: string;
  }>;
  followUpOwnerOptions: Array<{
    label: string;
    value: string;
  }>;
  preventiveActionOwnerOptions: Array<{
    label: string;
    value: string;
  }>;
  taskTemplateOptions: Array<{
    label: string;
    value: string;
  }>;
  customerOptions: Array<{
    label: string;
    value: string;
  }>;
  quoteOptions: Array<{
    label: string;
    value: string;
  }>;
  commercialBasisOptions: Array<{
    label: string;
    value: string;
  }>;
};

function toDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function getTaskSummary(tasks: ProjectDetailPageProps["project"]["tasks"]) {
  return {
    todo: tasks.filter((task) => task.status === "TODO").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    done: tasks.filter((task) => task.status === "DONE").length,
  };
}

function getChecklistSummary(tasks: ProjectDetailPageProps["project"]["tasks"]) {
  return getChecklistProgress(tasks.flatMap((task) => task.checklistItems));
}

function getPlanningSummary(tasks: ProjectDetailPageProps["project"]["tasks"]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingLimit = new Date();
  upcomingLimit.setDate(upcomingLimit.getDate() + 7);

  return {
    scheduled: tasks.filter((task) => task.plannedStartDate || task.plannedEndDate).length,
    upcoming: tasks.filter(
      (task) =>
        (task.plannedStartDate &&
          task.plannedStartDate >= today &&
          task.plannedStartDate <= upcomingLimit) ||
        (task.dueDate &&
          task.dueDate >= today &&
          task.dueDate <= upcomingLimit &&
          task.status !== "DONE"),
    ).length,
    overdue: tasks.filter((task) => isTaskOverdue(task)).length,
  };
}

function getRecentTaskActivity(tasks: ProjectDetailPageProps["project"]["tasks"]) {
  return tasks
    .flatMap((task) =>
      task.timelineEvents.map((event) => ({
        taskTitle: task.title,
        event,
      })),
    )
    .sort((a, b) => b.event.createdAt.getTime() - a.event.createdAt.getTime())
    .slice(0, 6);
}

export function ProjectDetailPage({
  companySlug,
  canManage,
  viewerRole,
  project,
  totalDurationLabel,
  teamMembers,
  taskAssigneeOptions,
  followUpOwnerOptions,
  preventiveActionOwnerOptions,
  taskTemplateOptions,
  customerOptions,
  quoteOptions,
  commercialBasisOptions,
}: ProjectDetailPageProps) {
  const summary = getTaskSummary(project.tasks);
  const checklistSummary = getChecklistSummary(project.tasks);
  const planningSummary = getPlanningSummary(project.tasks);
  const recentTaskActivity = getRecentTaskActivity(project.tasks);
  const deliveryTimeline = getProjectDeliveryTimeline(project.tasks);
  const deliverySummary = getProjectDeliverySummary(project.tasks, project.timeEntries);
  const kickoffSummary = getKickoffSummary(project);
  const earlyPhase = getProjectEarlyPhaseSummary(project);
  const riskSummary = getProjectRiskSummary(project);
  const readiness = getProjectReadinessSummary({
    startDate: project.startDate,
    endDate: project.endDate,
    kickoffStatus: project.kickoffStatus,
    assignments: project.assignments,
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
    })),
  });
  const recurringPatterns = detectRecurringBlockerPatterns(
    project.tasks.flatMap((task) =>
      task.blockers.map((blocker) => ({
        id: blocker.id,
        title: blocker.title,
        status: blocker.status,
        severity: blocker.severity,
        createdAt: blocker.createdAt,
        reopenedAt: blocker.reopenedAt,
        outcomeStatus: blocker.outcomeStatus,
        projectId: project.id,
        projectTitle: project.title,
        taskId: task.id,
        taskTitle: task.title,
        preventiveActions: blocker.preventiveActions,
      })),
    ),
  );
  const openBlockers = project.tasks.flatMap((task) =>
    task.blockers.filter((blocker) => blocker.status === "OPEN"),
  );
  const overduePreventiveActions = project.preventiveActions.filter(
    (action) => action.dueDate && action.dueDate < new Date() && action.status !== "DONE",
  ).length;
  const blockerCounts = {
    low: openBlockers.filter((blocker) => blocker.severity === "LOW").length,
    medium: openBlockers.filter((blocker) => blocker.severity === "MEDIUM").length,
    high: openBlockers.filter((blocker) => blocker.severity === "HIGH").length,
  };
  const improvementSummary = {
    active: project.executionImprovements.filter((item) => item.status === "APPLIED").length,
    proposed: project.executionImprovements.filter((item) => item.status === "PROPOSED").length,
    guidance: project.executionImprovements.filter((item) => item.targetType === "TASK_GUIDANCE").length,
    checklist: project.executionImprovements.filter((item) => item.targetType === "CHECKLIST_ITEM").length,
  };
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow={project.customerName}
        title={project.title}
        description={project.description || "No description added yet."}
        actions={
          <StatusBadge
            label={getProjectStatusLabel(project.status)}
            tone={getProjectStatusTone(project.status)}
          />
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <ProjectKickoffPanel
          companySlug={companySlug}
          projectId={project.id}
          canManage={canManage}
          kickoffStatus={project.kickoffStatus}
          kickoffNotes={project.kickoffNotes}
          kickoffCompletedAt={project.kickoffCompletedAt?.toISOString() ?? null}
          kickoffCompletedByName={project.kickoffCompletedBy?.name ?? null}
          startDate={toDateInputValue(project.startDate)}
          endDate={toDateInputValue(project.endDate)}
          assignedUserIds={project.assignments.map((assignment) => assignment.user.id)}
          teamMembers={teamMembers}
          firstTasks={project.tasks
            .filter((task) => task.status !== "DONE")
            .slice(0, 6)
            .map((task) => ({
            id: task.id,
            title: task.title,
            assignedUserName: task.assignedUser?.name ?? null,
            statusLabel: task.status === "IN_PROGRESS" ? "In progress" : task.status === "DONE" ? "Done" : "To do",
          }))}
          readiness={{
            isReady: readiness.isReady,
            completedCount: readiness.completedCount,
            totalCount: readiness.totalCount,
            items: readiness.readinessItems,
          }}
        />

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Project start summary
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What the team will see first
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={getProjectKickoffLabel(project.kickoffStatus)}
              tone={getProjectKickoffTone(project.kickoffStatus)}
            />
            <StatusBadge
              label={`${project.assignments.length} team members`}
              tone="primary"
            />
            <StatusBadge
              label={`${kickoffSummary.focusTasks.length} first tasks`}
              tone="accent"
            />
          </div>
          <div className="space-y-3">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Kickoff notes
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
                {project.kickoffNotes || "No kickoff note added yet."}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                First assigned work
              </p>
              <div className="mt-3 space-y-3">
                {kickoffSummary.focusTasks.length > 0 ? (
                  kickoffSummary.focusTasks.map((task) => (
                    <div key={task.id} className="rounded-[16px] bg-white px-4 py-3">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {task.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        {task.assignedUser
                          ? `Assigned to ${task.assignedUser.name}`
                          : "Not assigned yet"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Add one or more tasks so the kickoff has a clear first step.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Who owns what first
              </p>
              <div className="mt-3 space-y-3">
                {kickoffSummary.groupedAssignments.length > 0 ? (
                  kickoffSummary.groupedAssignments.map((group) => (
                    <div key={group.ownerId} className="rounded-[16px] bg-white px-4 py-3">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {group.ownerName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        {group.tasks.map((task) => task.title).join(", ")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Complete kickoff with first focus tasks to make starting ownership clear.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Timeline
          </p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            {project.startDate ? formatDateLabel(project.startDate) : "No start date"}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {project.endDate ? `Ends ${formatDateLabel(project.endDate)}` : "No end date yet"}
          </p>
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Location
          </p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            {project.location || "Not added yet"}
          </p>
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Total logged time
          </p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            {totalDurationLabel}
          </p>
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Planning summary
          </p>
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            {planningSummary.upcoming} upcoming
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {planningSummary.overdue} overdue | {planningSummary.scheduled} scheduled
          </p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              First week follow-through
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Is the project start staying on track?
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={getEarlyPhaseHealthLabel(earlyPhase.level)}
              tone={getEarlyPhaseHealthTone(earlyPhase.level)}
            />
            {earlyPhase.daysFromKickoff !== null ? (
              <StatusBadge
                label={`Day ${earlyPhase.daysFromKickoff + 1} after kickoff`}
                tone="primary"
              />
            ) : null}
            <StatusBadge
              label={`${earlyPhase.completed}/${earlyPhase.total} first tasks done`}
              tone={earlyPhase.completed === earlyPhase.total && earlyPhase.total > 0 ? "success" : "accent"}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Completed</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-success)]">
                {earlyPhase.completed}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">In progress</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                {earlyPhase.inProgress}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Overdue</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                {earlyPhase.overdue}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Blocked</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                {earlyPhase.blocked}
              </p>
            </div>
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">First-step checklist progress</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
              {earlyPhase.checklistCompleted} of {earlyPhase.checklistTotal}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {earlyPhase.checklistPercentage}% of checklist steps completed in the kickoff phase.
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Needs attention now
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Early drift signals
            </h2>
          </div>
          <div className="space-y-3">
            {earlyPhase.needsAttention.length > 0 ? (
              earlyPhase.needsAttention.map((signal) => (
                <div
                  key={signal}
                  className="rounded-[18px] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]"
                >
                  {signal}
                </div>
              ))
            ) : (
              <div className="rounded-[18px] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                The first-phase work is moving in a healthy direction right now.
              </div>
            )}
          </div>
          <div className="space-y-3">
            {earlyPhase.trackedTasks.map((task) => (
              <div key={task.id} className="rounded-[18px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {task.title}
                  </p>
                  <StatusBadge label="Kickoff focus task" tone="accent" />
                  {task.status === "IN_PROGRESS" ? (
                    <StatusBadge label="Active first-step work" tone="primary" />
                  ) : null}
                  {isTaskOverdue(task) ? (
                    <StatusBadge label="Delayed after kickoff" tone="danger" />
                  ) : null}
                  {task.blockers.some((blocker) => blocker.status === "OPEN") ? (
                    <StatusBadge label="Blocked during project start" tone="danger" />
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  {task.assignedUser
                    ? `Owned by ${task.assignedUser.name}`
                    : "Not assigned yet"}
                </p>
              </div>
            ))}
            {earlyPhase.trackedTasks.length === 0 ? (
              <div className="rounded-[18px] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                Complete kickoff and select first-step tasks to start tracking the first phase here.
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Completed recently
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {deliverySummary.completedRecently}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Tasks moved to done in the last 7 days.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Overdue tasks
          </p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">
            {deliverySummary.overdueTasks}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Work that needs attention before delivery slips.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Recent reassignments
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {deliverySummary.recentReassignments}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Task moves that may signal shifting workload.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Handoffs recently
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {deliverySummary.recentHandoffs}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Shared context added during task transfers.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Active work signal
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {deliverySummary.recentActiveWork}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Active or recently logged work sessions on this project.
          </p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Risk summary
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What may threaten delivery next
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={getProjectRiskLabel(riskSummary.level)}
              tone={getProjectRiskTone(riskSummary.level)}
            />
            <StatusBadge label={`${riskSummary.openBlockers} open blockers`} tone="danger" />
            <StatusBadge label={`${riskSummary.overdueTasks} overdue tasks`} tone="accent" />
            {riskSummary.recurringBlockers > 0 ? (
              <StatusBadge
                label={`${riskSummary.recurringBlockers} recurring blockers`}
                tone="danger"
              />
            ) : null}
            {riskSummary.overdueFollowUps > 0 ? (
              <StatusBadge label={`${riskSummary.overdueFollowUps} overdue follow-ups`} tone="danger" />
            ) : null}
            {overduePreventiveActions > 0 ? (
              <StatusBadge label={`${overduePreventiveActions} overdue preventive actions`} tone="accent" />
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Low</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-success)]">
                {blockerCounts.low}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Medium</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-accent)]">
                {blockerCounts.medium}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">High</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                {blockerCounts.high}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {riskSummary.signals.length > 0 ? (
              riskSummary.signals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-[18px] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]"
                >
                  {signal}
                </div>
              ))
            ) : (
              <div className="rounded-[18px] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                This project looks healthy right now with no strong delivery risk signals.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Needs attention
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Open blockers across the project
            </h2>
          </div>
          <div className="space-y-3">
            {openBlockers.length > 0 ? (
              openBlockers.slice(0, 6).map((blocker) => (
                <div key={blocker.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {blocker.title}
                    </p>
                    <StatusBadge
                      label={getBlockerSeverityLabel(blocker.severity)}
                      tone={getBlockerSeverityTone(blocker.severity)}
                    />
                    <StatusBadge
                      label={getBlockerStatusLabel(blocker.status)}
                      tone={getBlockerStatusTone(blocker.status)}
                    />
                    {blocker.followUpDate && blocker.followUpStatus !== "DONE" ? (
                      <StatusBadge label={`Follow-up ${formatDateLabel(blocker.followUpDate)}`} tone="accent" />
                    ) : null}
                    {blocker.outcomeStatus === "REOPENED" ? (
                      <StatusBadge label="Reopened" tone="danger" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                    {blocker.description}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    Reported by {blocker.user.name}
                  </p>
                  {blocker.followUpAction ? (
                    <p className="mt-2 text-sm text-[var(--color-foreground)]">
                      Next step: {blocker.followUpAction}
                    </p>
                  ) : null}
                  {blocker.outcomeSummary ? (
                    <p className="mt-2 text-sm text-[var(--color-foreground)]">
                      Outcome: {blocker.outcomeSummary}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No open blockers in this project right now.
              </p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Recurring blockers
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What keeps coming back
            </h2>
          </div>
          <div className="space-y-3">
            {recurringPatterns.length > 0 ? (
              recurringPatterns.slice(0, 4).map((pattern) => (
                <div key={pattern.key} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {pattern.blockers[0]?.title || pattern.normalizedTitle}
                    </p>
                    <StatusBadge label={`${pattern.count} times`} tone="danger" />
                    {pattern.activePreventiveActions > 0 ? (
                      <StatusBadge
                        label={`${pattern.activePreventiveActions} active actions`}
                        tone="primary"
                      />
                    ) : null}
                    {pattern.missingPrevention ? (
                      <StatusBadge label="No prevention yet" tone="accent" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    Latest around {pattern.blockers[0]?.taskTitle || "this task"}.
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No recurring blocker patterns have been detected in this project yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Preventive actions
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What should change next time
            </h2>
          </div>
          <div className="space-y-3">
            {project.preventiveActions.length > 0 ? (
              project.preventiveActions.slice(0, 5).map((action) => (
                <div key={action.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {action.title}
                    </p>
                    <StatusBadge
                      label={getPreventiveActionStatusLabel(action.status)}
                      tone={getPreventiveActionStatusTone(action.status)}
                    />
                    {action.dueDate && action.status !== "DONE" && action.dueDate < new Date() ? (
                      <StatusBadge label="Overdue" tone="danger" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                    {action.description}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    {action.relatedTask ? action.relatedTask.title : "Project-wide guidance"}
                    {action.owner ? ` | ${action.owner.name}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No preventive actions have been added for this project yet.
              </p>
            )}
          </div>
        </Card>
      </section>

      {project.executionImprovements.length > 0 ? (
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Prevention-driven execution changes
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What future tasks will inherit
            </h2>
          </div>
          <div className="space-y-3">
            {project.executionImprovements.map((improvement) => (
              <div key={improvement.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {improvement.title}
                  </p>
                  <StatusBadge
                    label={getExecutionImprovementTargetLabel(improvement.targetType)}
                    tone="primary"
                  />
                  <StatusBadge
                    label={getExecutionImprovementStatusLabel(improvement.status)}
                    tone={getExecutionImprovementStatusTone(improvement.status)}
                  />
                  {improvement.appliesToFutureTasks ? (
                    <StatusBadge label="Applies to future tasks" tone="accent" />
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {improvement.description}
                </p>
                {improvement.sourcePreventiveAction ? (
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    From preventive action: {improvement.sourcePreventiveAction.title}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Applied improvements</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{improvementSummary.active}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Proposed improvements</p>
          <p className="text-2xl font-semibold text-[var(--color-accent)]">{improvementSummary.proposed}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Checklist upgrades</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{improvementSummary.checklist}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Guidance upgrades</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{improvementSummary.guidance}</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Assigned team
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Who is connected to this project
            </h2>
          </div>

          <div className="space-y-3">
            {project.assignments.map((assignment) => (
              <div
                key={assignment.user.id}
                className="flex items-center justify-between rounded-[22px] bg-white p-4 shadow-[var(--shadow-card)]"
              >
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {assignment.user.name}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {assignment.user.email}
                  </p>
                </div>
                <StatusBadge
                  label={getRoleLabel(assignment.user.role)}
                  tone="primary"
                />
              </div>
            ))}
            {project.assignments.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No one is assigned yet.
              </p>
            ) : null}
          </div>
        </Card>

        {canManage ? (
          <ProjectForm
            companySlug={companySlug}
            mode="edit"
            projectId={project.id}
            title="Edit this project"
            description="Update project details, adjust the team, and keep time linked to the right work."
            submitLabel="Save changes"
            teamMembers={teamMembers}
            statusOptions={projectStatusOptions}
            defaultValues={{
              customerId: project.customerId ?? "",
              quoteId: project.quoteId ?? "",
              customerName: project.customerName,
              title: project.title,
              description: project.description ?? "",
              status: project.status,
              commercialBasisType: project.commercialBasisType,
              budgetNet: project.budgetNet ?? "",
              budgetGross: project.budgetGross ?? "",
              budgetLaborValue: project.budgetLaborValue ?? "",
              budgetMaterialValue: project.budgetMaterialValue ?? "",
              startDate: toDateInputValue(project.startDate),
              endDate: toDateInputValue(project.endDate),
              location: project.location ?? "",
              assignedUserIds: project.assignments.map((assignment) => assignment.user.id),
            }}
            customerOptions={customerOptions}
            quoteOptions={quoteOptions}
            commercialBasisOptions={commercialBasisOptions}
          />
        ) : (
          <Card className="space-y-4">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Progress snapshot
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What still needs attention
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">To do</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                  {summary.todo}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">In progress</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                  {summary.inProgress}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Done</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                  {summary.done}
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Project tasks
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Work items, timing, and checklist progress
          </h2>
        </div>

        <div className="space-y-5">
          {project.tasks.map((task) => {
            const progress = getTaskChecklistProgress(task.checklistItems);
            const noteSummary = getTaskNoteSummary(task.taskNotes);

            return (
              <div key={task.id} className="space-y-4">
                <TaskCard
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  assigneeName={task.assignedUser?.name}
                  plannedWindowLabel={getPlanningWindowLabel({
                    plannedStartDate: task.plannedStartDate,
                    plannedEndDate: task.plannedEndDate,
                  })}
                  dueDate={task.dueDate ? formatDateLabel(task.dueDate) : null}
                  overdue={isTaskOverdue(task)}
                  timeCount={task._count.timeEntries}
                  checklistTotal={progress.total}
                  checklistCompleted={progress.completed}
                  checklistPercentage={progress.percentage}
                />

                <div className="flex flex-wrap gap-2">
                  {noteSummary.hasHandoff ? (
                    <StatusBadge label="Handoff context" tone="accent" />
                  ) : null}
                  {noteSummary.hasNotes ? (
                    <StatusBadge label={`${task.taskNotes.length} notes`} tone="primary" />
                  ) : null}
                  {task.timelineEvents.some((event) => event.type === "ASSIGNEE_CHANGED") ? (
                    <StatusBadge label="Recent reassignment" tone="primary" />
                  ) : null}
                  {task.blockers.some((blocker) => blocker.status === "OPEN") ? (
                    <StatusBadge label="Blocked" tone="danger" />
                  ) : null}
                  {task.blockers.some((blocker) => blocker.outcomeStatus === "REOPENED") ? (
                    <StatusBadge label="Fix failed" tone="danger" />
                  ) : null}
                  {task.blockers.some(
                    (blocker) =>
                      blocker.status === "OPEN" &&
                      (!blocker.followUpAction || !blocker.followUpDate),
                  ) ? (
                    <StatusBadge label="Needs follow-up" tone="accent" />
                  ) : null}
                </div>

                <ChecklistList
                  companySlug={companySlug}
                  projectId={project.id}
                  taskId={task.id}
                  items={task.checklistItems.map((item) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    status: item.status,
                    sortOrder: item.sortOrder,
                    assignedUser: item.assignedUser
                      ? {
                          id: item.assignedUser.id,
                          name: item.assignedUser.name,
                        }
                      : null,
                    sourceLabel: item.sourceExecutionImprovementId
                      ? "Added from prevention"
                      : null,
                  }))}
                  canManage={canManage}
                  canToggle
                />

                {task.appliedImprovements.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {task.appliedImprovements.map((applied) => (
                      <StatusBadge
                        key={applied.id}
                        label={
                          applied.executionImprovement.targetType === "TASK_GUIDANCE"
                            ? `Guidance: ${applied.executionImprovement.title}`
                            : `Checklist: ${applied.executionImprovement.title}`
                        }
                        tone="accent"
                      />
                    ))}
                  </div>
                ) : null}

                <TaskActivityPanel
                  companySlug={companySlug}
                  projectId={project.id}
                  taskId={task.id}
                  viewerRole={viewerRole}
                  notes={task.taskNotes.map((note) => ({
                    id: note.id,
                    type: note.type,
                    content: note.content,
                    createdAt: note.createdAt.toISOString(),
                    user: {
                      id: note.user.id,
                      name: note.user.name,
                    },
                  }))}
                />

                <TaskTimelinePanel
                  events={task.timelineEvents.map((event) => ({
                    id: event.id,
                    type: event.type,
                    title: event.title,
                    description: event.description,
                    createdAt: event.createdAt.toISOString(),
                    user: event.user
                      ? {
                          id: event.user.id,
                          name: event.user.name,
                        }
                      : null,
                  }))}
                />

                <TaskBlockerPanel
                  companySlug={companySlug}
                  projectId={project.id}
                  taskId={task.id}
                  viewerRole={viewerRole}
                  blockers={task.blockers.map((blocker) => ({
                    id: blocker.id,
                    title: blocker.title,
                    description: blocker.description,
                    status: blocker.status,
                    severity: blocker.severity,
                    followUpAction: blocker.followUpAction,
                    followUpOwner: blocker.followUpOwner
                      ? {
                          id: blocker.followUpOwner.id,
                          name: blocker.followUpOwner.name,
                        }
                      : null,
                    followUpDate: blocker.followUpDate?.toISOString().slice(0, 10) ?? null,
                    followUpStatus: blocker.followUpStatus,
                    lastFollowUpAt: blocker.lastFollowUpAt?.toISOString() ?? null,
                    outcomeStatus: blocker.outcomeStatus,
                    outcomeSummary: blocker.outcomeSummary,
                    verifiedAt: blocker.verifiedAt?.toISOString() ?? null,
                    reopenedAt: blocker.reopenedAt?.toISOString() ?? null,
                    reopenReason: blocker.reopenReason,
                    createdAt: blocker.createdAt.toISOString(),
                    resolvedAt: blocker.resolvedAt?.toISOString() ?? null,
                    resolutionNote: blocker.resolutionNote,
                    verifiedBy: blocker.verifiedBy
                      ? {
                          id: blocker.verifiedBy.id,
                          name: blocker.verifiedBy.name,
                        }
                      : null,
                    preventiveActions: blocker.preventiveActions.map((action) => ({
                      id: action.id,
                      title: action.title,
                      description: action.description,
                      status: action.status,
                      dueDate: action.dueDate?.toISOString().slice(0, 10) ?? null,
                      owner: action.owner
                        ? {
                            id: action.owner.id,
                            name: action.owner.name,
                          }
                        : null,
                    })),
                    user: {
                      id: blocker.user.id,
                      name: blocker.user.name,
                    },
                  }))}
                  followUpOwnerOptions={followUpOwnerOptions}
                  preventiveActionOwnerOptions={preventiveActionOwnerOptions}
                />

                {canManage ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <TaskForm
                      companySlug={companySlug}
                      projectId={project.id}
                      taskId={task.id}
                      mode="edit"
                      title={`Edit ${task.title}`}
                      description="Update assignment, status, planned dates, due date, or priority for this work item."
                      submitLabel="Save task"
                      statusOptions={taskStatusOptions}
                      priorityOptions={taskPriorityOptions}
                      assigneeOptions={taskAssigneeOptions}
                      templateOptions={taskTemplateOptions}
                      availableImprovements={project.executionImprovements.map((improvement) => ({
                        id: improvement.id,
                        title: improvement.title,
                        description: improvement.description,
                        targetLabel: getExecutionImprovementTargetLabel(improvement.targetType),
                        statusLabel: getExecutionImprovementStatusLabel(improvement.status),
                        sourcePreventiveActionTitle:
                          improvement.sourcePreventiveAction?.title ?? null,
                        defaultSelected: false,
                      }))}
                      defaultValues={{
                        title: task.title,
                        description: task.description ?? "",
                        status: task.status,
                        priority: task.priority,
                        assignedUserId: task.assignedUser?.id ?? "",
                        plannedStartDate: task.plannedStartDate
                          ? toDateInputValue(task.plannedStartDate)
                          : "",
                        plannedEndDate: task.plannedEndDate
                          ? toDateInputValue(task.plannedEndDate)
                          : "",
                        dueDate: task.dueDate ? toDateInputValue(task.dueDate) : "",
                      }}
                    />

                    <div className="space-y-4">
                      <ChecklistItemForm
                        companySlug={companySlug}
                        projectId={project.id}
                        taskId={task.id}
                        mode="create"
                        title="Add checklist step"
                        description="Break the task into small steps so the team can work clearly and check off progress on site."
                        submitLabel="Add step"
                        statusOptions={checklistStatusOptions}
                        assigneeOptions={taskAssigneeOptions}
                        defaultValues={{
                          title: "",
                          description: "",
                          status: "TODO",
                          sortOrder: task.checklistItems.length,
                          assignedUserId: "",
                        }}
                      />

                      {task.checklistItems.map((item) => (
                        <ChecklistItemForm
                          key={item.id}
                          companySlug={companySlug}
                          projectId={project.id}
                          taskId={task.id}
                          itemId={item.id}
                          mode="edit"
                          title={`Edit "${item.title}"`}
                          description="Adjust ownership, order, or the wording of this checklist step."
                          submitLabel="Save step"
                          statusOptions={checklistStatusOptions}
                          assigneeOptions={taskAssigneeOptions}
                          defaultValues={{
                            title: item.title,
                            description: item.description ?? "",
                            status: item.status,
                            sortOrder: item.sortOrder,
                            assignedUserId: item.assignedUser?.id ?? "",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {project.tasks.length === 0 ? (
            <Card className="space-y-3">
              <p className="text-lg font-semibold text-[var(--color-foreground)]">
                No tasks yet
              </p>
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                Create the first work item so time and progress can be tracked against exact work inside this project.
              </p>
            </Card>
          ) : null}
        </div>
      </section>

      {canManage ? (
        <TaskForm
          companySlug={companySlug}
          projectId={project.id}
          mode="create"
          title="Create a new task"
          description="Keep tasks lightweight and clear so the team understands exactly what work is expected."
          submitLabel="Create task"
          statusOptions={taskStatusOptions}
          priorityOptions={taskPriorityOptions}
          assigneeOptions={taskAssigneeOptions}
          templateOptions={taskTemplateOptions}
          availableImprovements={project.executionImprovements.map((improvement) => ({
            id: improvement.id,
            title: improvement.title,
            description: improvement.description,
            targetLabel: getExecutionImprovementTargetLabel(improvement.targetType),
            statusLabel: getExecutionImprovementStatusLabel(improvement.status),
            sourcePreventiveActionTitle: improvement.sourcePreventiveAction?.title ?? null,
            defaultSelected: improvement.appliesToFutureTasks && improvement.status !== "ARCHIVED",
          }))}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Task progress summary
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Delivery progress at a glance
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">To do</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                {summary.todo}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">In progress</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                {summary.inProgress}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Done</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                {summary.done}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Planning summary
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Upcoming work and timing risks
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Scheduled</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                {planningSummary.scheduled}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Upcoming</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                {planningSummary.upcoming}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Overdue</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                {planningSummary.overdue}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Checklist completion
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Execution quality at a glance
            </h2>
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Completed steps
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
              {checklistSummary.completed} of {checklistSummary.total}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {checklistSummary.percentage}% complete across all tasks in this project.
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ProjectDeliveryTimeline
          canManage={canManage}
          events={deliveryTimeline.map((event) => ({
            ...event,
            createdAt: event.createdAt.toISOString(),
          }))}
          title={canManage ? "Project delivery timeline" : "Recent project activity"}
          description={
            canManage
              ? "Follow the execution flow across tasks, handoffs, and recent work in one place."
              : "See the most recent project changes that can help you understand the work around you."
          }
        />

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Launch activity
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What changed at kickoff
            </h2>
          </div>

          <div className="space-y-3">
            {project.activityEvents.length > 0 ? (
              project.activityEvents.map((event) => (
                <div key={event.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {event.title}
                    </p>
                    <StatusBadge
                      label={getProjectActivityEventLabel(event.type)}
                      tone={getProjectActivityEventTone(event.type)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    {event.user ? `By ${event.user.name}` : "Recorded automatically"}
                  </p>
                  {event.description ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                      {event.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    {formatDateLabel(event.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Kickoff completion and launch updates will show here.
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Recent task activity
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Latest changes across the work
            </h2>
          </div>

          <div className="space-y-3">
            {recentTaskActivity.length > 0 ? (
              recentTaskActivity.map(({ taskTitle, event }) => (
                <div
                  key={event.id}
                  className="rounded-[20px] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {event.title}
                    </p>
                    <StatusBadge
                      label={getTaskTimelineEventLabel(event.type)}
                      tone={getTaskTimelineEventTone(event.type)}
                    />
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {taskTitle}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    {event.user ? `By ${event.user.name}` : "Recorded automatically"}
                  </p>
                  {event.description ? (
                    <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                      {event.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    {formatDateLabel(event.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No task activity yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Recent project activity
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Latest work sessions on this project
            </h2>
          </div>

          <div className="space-y-3">
            {project.timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[20px] bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {entry.user.name}
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {formatDateLabel(entry.date)} | {formatTimeLabel(entry.startTime)} to{" "}
                      {entry.endTime ? formatTimeLabel(entry.endTime) : "Now"}
                    </p>
                    <p className="text-sm text-[var(--color-foreground)]">
                      {entry.task?.title || "General project work"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={getTimeStatusLabel(entry.status)}
                      tone={getTimeStatusTone(entry.status)}
                    />
                    <StatusBadge
                      label={formatDuration(entry.startTime, entry.endTime)}
                      tone="primary"
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {entry.note || "No note added for this session."}
                </p>
              </div>
            ))}
            {project.timeEntries.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No time logged on this project yet.
              </p>
            ) : null}
          </div>
        </Card>

        {canManage ? (
          <>
            <Card className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Fakturering och kassaflode
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                  Styr fakturautkastet fran projektet
                </h2>
                <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                  Bygg slutfaktura, periodfaktura eller delfaktura utan att dubbelfakturera samma rader.
                </p>
              </div>

              {project.commercialSummary ? (
                <div className="space-y-4 rounded-[22px] bg-[var(--color-surface)] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={project.commercialSummary.basisLabel} tone="primary" />
                    <StatusBadge label={project.commercialSummary.varianceLabel} tone={project.commercialSummary.varianceTone} />
                    {project.linkedQuote ? (
                      <a href={`/workspace/${companySlug}/quotes/${project.linkedQuote.id}`} className="text-sm font-semibold text-[var(--color-primary)]">
                        {project.linkedQuote.quoteNumber}
                      </a>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[18px] bg-white p-4">
                      <p className="text-sm text-[var(--color-muted-foreground)]">Avtalat värde</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{formatCurrency(project.commercialSummary.agreedGross)}</p>
                    </div>
                    <div className="rounded-[18px] bg-white p-4">
                      <p className="text-sm text-[var(--color-muted-foreground)]">Fakturerat</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{formatCurrency(project.commercialSummary.billed)}</p>
                    </div>
                    <div className="rounded-[18px] bg-white p-4">
                      <p className="text-sm text-[var(--color-muted-foreground)]">Ofakturerat</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{formatCurrency(project.commercialSummary.unbilled)}</p>
                    </div>
                    <div className="rounded-[18px] bg-white p-4">
                      <p className="text-sm text-[var(--color-muted-foreground)]">Återstår inom ram</p>
                      <p className={`mt-1 text-xl font-semibold ${Number(project.commercialSummary.remainingCommercialRoom) < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
                        {formatCurrency(project.commercialSummary.remainingCommercialRoom)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {project.billingSummary ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Fakturerat</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(project.billingSummary.totalBilledAmount)}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Betalt</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--color-success)]">
                      {formatCurrency(project.billingSummary.totalPaidAmount)}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Utestående</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(project.billingSummary.outstandingReceivables)}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Projektvärde nu</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--color-primary)]">
                      {formatCurrency(
                        Number(project.billingSummary.totalBilledAmount) +
                          Number(project.billingSummary.remainingBillableAmount),
                      )}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Fakturerat + kvar att fakturera {formatCurrency(project.billingSummary.remainingBillableAmount)}
                    </p>
                  </div>
                </div>
              ) : null}

              {project.billingSummary ? (
                <ProjectBillingPanel
                  companySlug={companySlug}
                  projectId={project.id}
                  customerId={project.customerId ?? null}
                  customerName={project.customerName}
                  customerOptions={customerOptions}
                  summary={project.billingSummary}
                  commercialOverview={
                    project.commercialSummary
                      ? {
                          agreedGross: project.commercialSummary.agreedGross,
                          billed: project.commercialSummary.billed,
                          remainingCommercialRoom: project.commercialSummary.remainingCommercialRoom,
                        }
                      : null
                  }
                  billableTimeRows={project.billableTimeRows}
                  billableMaterialRows={project.billableMaterialRows}
                />
              ) : null}

              <div className="space-y-3">
                {project.projectInvoices.length > 0 ? (
                  project.projectInvoices.map((invoice) => (
                    <a
                      key={invoice.id}
                      href={`/workspace/${companySlug}/invoices/${invoice.id}`}
                      className="block rounded-[20px] bg-[var(--color-surface)] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-[var(--color-foreground)]">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            Due {formatDateLabel(invoice.dueDate)} · Paid {formatCurrency(invoice.paidAmount)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            label={getInvoiceStatusLabel(invoice.status)}
                            tone={getInvoiceStatusTone(invoice.status)}
                          />
                          <StatusBadge
                            label={formatCurrency(invoice.totalGross)}
                            tone="primary"
                          />
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    No invoice has been created from this project yet.
                  </p>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              <MaterialEntryForm companySlug={companySlug} projectId={project.id} />

              <Card className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    Recent materials
                  </p>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                    What can still be billed
                  </h2>
                </div>

                <div className="space-y-3">
                  {project.materialEntries.map((entry) => (
                    <div key={entry.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-[var(--color-foreground)]">
                            {entry.description}
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            Added by {entry.user.name} on {formatDateLabel(entry.createdAt)}
                          </p>
                          <p className="text-sm text-[var(--color-foreground)]">
                            {entry.quantity} x {formatCurrency(entry.unitPrice)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            label={entry.isBillable ? "Billable" : "Internal"}
                            tone={entry.isBillable ? "accent" : "default"}
                          />
                          <StatusBadge
                            label={entry.invoiced ? "Already invoiced" : "Not invoiced yet"}
                            tone={entry.invoiced ? "success" : "primary"}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {project.materialEntries.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      No material has been added to this project yet.
                    </p>
                  ) : null}
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
