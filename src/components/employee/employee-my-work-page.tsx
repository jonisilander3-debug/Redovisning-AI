import Link from "next/link";
import {
  BlockerOutcomeStatus,
  BlockerSeverity,
  BlockerFollowUpStatus,
  BlockerStatus,
  ChecklistItemStatus,
  ProjectKickoffStatus,
  ProjectStatus,
  TaskNoteType,
  TaskPriority,
  TaskStatus,
  TaskTimelineEventType,
} from "@prisma/client";
import { ChecklistList } from "@/components/checklist/checklist-list";
import { PreventiveActionPanel } from "@/components/blockers/preventive-action-panel";
import { TaskBlockerPanel } from "@/components/blockers/task-blocker-panel";
import { TaskActivityPanel } from "@/components/tasks/task-activity-panel";
import { TaskTimelinePanel } from "@/components/tasks/task-timeline-panel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getProjectStatusLabel,
  getProjectStatusTone,
} from "@/lib/project-management";
import { getBlockerFollowUpStatusLabel } from "@/lib/blockers";
import {
  getTaskPriorityLabel,
  getTaskPriorityTone,
  getTaskStatusLabel,
  getTaskStatusTone,
} from "@/lib/task-management";

type EmployeeMyWorkPageProps = {
  companySlug: string;
  companyName: string;
  projects: Array<{
    id: string;
    customerName: string;
    title: string;
    description: string | null;
    status: ProjectStatus;
    location: string | null;
    kickoffStatus: ProjectKickoffStatus;
    kickoffStatusLabel: string;
    kickoffNotes: string | null;
    kickoffCompletedAt: string | null;
    kickoffCompletedByName: string | null;
    kickoffFocusTasks: Array<{
      id: string;
      title: string;
      assignedUserId: string | null;
      assignedUserName: string | null;
      status: TaskStatus;
    }>;
    activityEvents: Array<{
      id: string;
      type: "KICKOFF_COMPLETED";
      title: string;
      description: string | null;
      createdAt: string;
      userName: string | null;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      plannedWindowLabel: string;
      isToday: boolean;
      isThisWeek: boolean;
      dueDate: string | null;
      isOverdue: boolean;
      assignedToMe: boolean;
      noteSummary: {
        hasNotes: boolean;
        hasHandoff: boolean;
        latestType: TaskNoteType | null;
        latestAt: Date | null;
      };
      timelineSummary: {
        hasTimeline: boolean;
        latestType: TaskTimelineEventType | null;
        latestAt: Date | null;
        hasRecentReassignment: boolean;
        hasRecentHandoff: boolean;
      };
      taskNotes: Array<{
        id: string;
        type: TaskNoteType;
        content: string;
        createdAt: string;
        user: {
          id: string;
          name: string;
        };
      }>;
      timelineEvents: Array<{
        id: string;
        type: TaskTimelineEventType;
        title: string;
        description: string | null;
        createdAt: string;
        user: {
          id: string;
          name: string;
        } | null;
      }>;
      blockers: Array<{
        id: string;
        title: string;
        description: string;
        status: BlockerStatus;
        severity: BlockerSeverity;
        followUpAction: string | null;
        followUpDate: string | null;
        followUpStatus: BlockerFollowUpStatus | null;
        lastFollowUpAt: string | null;
        outcomeStatus: BlockerOutcomeStatus;
        outcomeSummary: string | null;
        verifiedAt: string | null;
        reopenedAt: string | null;
        reopenReason: string | null;
        followUpOwner: {
          id: string;
          name: string;
        } | null;
        verifiedBy: {
          id: string;
          name: string;
        } | null;
        createdAt: string;
        resolvedAt: string | null;
        resolutionNote: string | null;
        user: {
          id: string;
          name: string;
        };
        preventiveActions?: Array<{
          id: string;
          title: string;
          description: string;
          status: "PROPOSED" | "ACTIVE" | "DONE";
          dueDate: string | null;
          owner: {
            id: string;
            name: string;
          } | null;
        }>;
      }>;
      preventiveActions: Array<{
        id: string;
        title: string;
        description: string;
        status: "PROPOSED" | "ACTIVE" | "DONE";
        dueDate: string | null;
        owner: {
          id: string;
          name: string;
        } | null;
        sourceBlockerTitle: string | null;
      }>;
      progress: {
        total: number;
        completed: number;
        percentage: number;
      };
      checklistItems: Array<{
        id: string;
        title: string;
        description: string | null;
        status: ChecklistItemStatus;
        sortOrder: number;
        sourceLabel?: string | null;
        assignedUser: {
          id: string;
          name: string;
        } | null;
      }>;
      appliedImprovements: Array<{
        id: string;
        title: string;
        description: string;
        targetType: "TASK_GUIDANCE" | "CHECKLIST_ITEM";
        sourcePreventiveActionTitle: string | null;
      }>;
    }>;
  }>;
};

export function EmployeeMyWorkPage({
  companySlug,
  companyName,
  projects,
}: EmployeeMyWorkPageProps) {
  const allTasks = projects.flatMap((project) => project.tasks);
  const todayAssigned = allTasks.filter(
    (task) => task.status !== "DONE" && (task.isToday || task.isOverdue),
  ).length;
  const thisWeek = allTasks.filter(
    (task) => task.status !== "DONE" && task.isThisWeek,
  ).length;
  const upcoming = allTasks.filter(
    (task) =>
      task.plannedWindowLabel !== "Not scheduled yet" &&
      task.status !== "DONE" &&
      !task.isOverdue &&
      !task.isThisWeek,
  ).length;
  const overdue = allTasks.filter((task) => task.isOverdue).length;
  const myFollowUps = allTasks.flatMap((task) =>
    task.blockers.filter(
      (blocker) =>
        blocker.status === "OPEN" &&
        blocker.followUpOwner &&
        blocker.followUpAction,
    ),
  );
  const kickoffProjects = projects.filter(
    (project) => project.kickoffStatus === "COMPLETED" || project.kickoffStatus === "IN_PROGRESS",
  );
  const firstPhaseTasks = projects.flatMap((project) =>
    project.tasks.filter((task) =>
      project.kickoffFocusTasks.some((focus) => focus.id === task.id),
    ),
  );
  const firstPhaseOverdue = firstPhaseTasks.filter((task) => task.isOverdue).length;
  const firstPhaseBlocked = firstPhaseTasks.filter((task) =>
    task.blockers.some((blocker) => blocker.status === "OPEN"),
  ).length;

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="My Work"
          title="Your assigned work will show up here"
          description={`${companyName} can assign projects and tasks to you, and they will appear here in one simple list.`}
        />
        <EmptyState
          title="No projects assigned yet"
          description="Once a project is assigned to you, this page will become your simple starting point for understanding what work you are connected to."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Work"
        title="See your assigned work clearly"
        description={`${companyName} keeps your projects, tasks, and checklist steps together so you always know what still needs to be done.`}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            On my list
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {todayAssigned}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Active or upcoming tasks assigned to you.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            This week
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {thisWeek}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Planned or due during this week.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Upcoming
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {upcoming}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Work with a planned window ahead.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            My follow-ups
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {myFollowUps.length}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Active blocker actions assigned to you.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Overdue
          </p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">
            {overdue}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Items that may need attention first.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            First week priorities
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {firstPhaseTasks.length}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Tasks that matter most right after kickoff.
          </p>
        </Card>
      </div>

      {kickoffProjects.length > 0 ? (
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Project starts
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              New work that is getting started
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">First week tasks</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                {firstPhaseTasks.length}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Delayed</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                {firstPhaseOverdue}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">Blocked</p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                {firstPhaseBlocked}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {kickoffProjects.map((project) => (
              <div key={project.id} className="rounded-[20px] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {project.title}
                  </p>
                  <StatusBadge
                    label={project.kickoffStatusLabel}
                    tone={project.kickoffStatus === "COMPLETED" ? "success" : "accent"}
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {project.kickoffNotes || "No kickoff note has been shared yet."}
                </p>
                {project.kickoffFocusTasks.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {project.kickoffFocusTasks.map((task) => (
                      <div key={task.id} className="rounded-[16px] bg-[var(--color-surface)] px-4 py-3">
                        <p className="font-semibold text-[var(--color-foreground)]">
                          {task.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                          {task.assignedUserId === null
                            ? "Starting task not assigned yet"
                            : task.assignedUserName === null
                              ? "Starting task assigned"
                              : task.assignedUserName === "Unassigned"
                                ? "Starting task not assigned yet"
                                : `Starts with ${task.assignedUserName}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {project.kickoffCompletedAt ? (
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    Kickoff completed
                    {project.kickoffCompletedByName
                      ? ` by ${project.kickoffCompletedByName}`
                      : ""}
                    .
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {myFollowUps.length > 0 ? (
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              My follow-ups
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What needs your attention next
            </h2>
          </div>
          <div className="space-y-3">
            {allTasks
              .flatMap((task) =>
                task.blockers
                  .filter(
                    (blocker) =>
                      blocker.status === "OPEN" &&
                      blocker.followUpOwner &&
                      blocker.followUpAction,
                  )
                  .map((blocker) => ({
                    taskTitle: task.title,
                    projectTitle:
                      projects.find((project) => project.tasks.some((item) => item.id === task.id))
                        ?.title ?? "",
                    blocker,
                  })),
              )
              .map(({ taskTitle, projectTitle, blocker }) => (
                <div key={blocker.id} className="rounded-[20px] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {blocker.followUpAction}
                    </p>
                    {blocker.followUpStatus ? (
                      <StatusBadge
                        label={getBlockerFollowUpStatusLabel(blocker.followUpStatus)}
                        tone={blocker.followUpStatus === "DONE" ? "success" : "accent"}
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    {projectTitle} | {taskTitle}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    Due: {blocker.followUpDate || "No date set"}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        {projects.map((project) => (
          <Card key={project.id} className="space-y-5 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  {project.customerName}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/workspace/${companySlug}/projects/${project.id}`}
                    className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]"
                  >
                    {project.title}
                  </Link>
                  <StatusBadge
                    label={getProjectStatusLabel(project.status)}
                    tone={getProjectStatusTone(project.status)}
                  />
                  <StatusBadge
                    label={project.kickoffStatusLabel}
                    tone={project.kickoffStatus === "COMPLETED" ? "success" : "accent"}
                  />
                </div>
              </div>
            </div>

            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                {project.description || "No project description added yet."}
              </p>

            {project.activityEvents.length > 0 ? (
              <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-4">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  Launch update
                </p>
                {project.activityEvents.slice(0, 1).map((event) => (
                  <div key={event.id} className="mt-2 space-y-1">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {event.title}
                    </p>
                    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                      {event.description || "Project kickoff changed the starting work and team context."}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {project.kickoffNotes ? (
              <div className="rounded-[20px] bg-[var(--color-primary-soft)] px-4 py-4">
                <p className="text-sm font-semibold text-[var(--color-primary)]">
                  Kickoff note
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
                  {project.kickoffNotes}
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              {project.tasks.length > 0 ? (
                project.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="space-y-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[var(--color-foreground)]">
                            {task.title}
                          </p>
                        {task.assignedToMe ? (
                          <StatusBadge label="Assigned to me" tone="primary" />
                        ) : null}
                        {project.kickoffFocusTasks.some((focus) => focus.id === task.id) ? (
                          <StatusBadge label="First priority task" tone="accent" />
                        ) : null}
                        {project.kickoffFocusTasks.some(
                          (focus) => focus.id === task.id && focus.assignedUserId !== null,
                        ) && task.assignedToMe ? (
                          <StatusBadge label="You were assigned at kickoff" tone="success" />
                        ) : null}
                        </div>
                        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                          {task.description || "No extra detail added yet."}
                        </p>
                        <div className="flex flex-col gap-1 text-sm text-[var(--color-muted-foreground)]">
                          <p>Planned: {task.plannedWindowLabel}</p>
                          <p className={task.isOverdue ? "text-[var(--color-danger)]" : ""}>
                            Due: {task.dueDate || "No due date"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={getTaskStatusLabel(task.status)}
                          tone={getTaskStatusTone(task.status)}
                        />
                        <StatusBadge
                          label={getTaskPriorityLabel(task.priority)}
                          tone={getTaskPriorityTone(task.priority)}
                        />
                        {task.isOverdue ? (
                          <StatusBadge label="Overdue" tone="danger" />
                        ) : null}
                        {project.kickoffFocusTasks.some((focus) => focus.id === task.id) &&
                        task.isOverdue ? (
                          <StatusBadge label="Delayed after kickoff" tone="danger" />
                        ) : null}
                        {task.noteSummary.hasHandoff ? (
                          <StatusBadge label="Handoff note" tone="accent" />
                        ) : null}
                        {task.noteSummary.hasNotes ? (
                          <StatusBadge label={`${task.taskNotes.length} notes`} tone="primary" />
                        ) : null}
                        {task.timelineSummary.hasRecentReassignment ? (
                          <StatusBadge label="Recently reassigned" tone="primary" />
                        ) : null}
                        {task.blockers.some((blocker) => blocker.status === "OPEN") ? (
                          <StatusBadge label="Blocked" tone="danger" />
                        ) : null}
                        {project.kickoffFocusTasks.some((focus) => focus.id === task.id) &&
                        task.blockers.some((blocker) => blocker.status === "OPEN") ? (
                          <StatusBadge label="Blocked during project start" tone="danger" />
                        ) : null}
                        {task.blockers.some((blocker) => blocker.outcomeStatus === "REOPENED") ? (
                          <StatusBadge label="Reopened" tone="danger" />
                        ) : null}
                        {task.preventiveActions.some((action) => action.status === "ACTIVE") ? (
                          <StatusBadge label="Known guidance" tone="accent" />
                        ) : null}
                        {task.appliedImprovements.length > 0 ? (
                          <StatusBadge label="Prevention applied" tone="success" />
                        ) : null}
                        {task.blockers.some(
                          (blocker) =>
                            blocker.status === "OPEN" &&
                            blocker.followUpOwner &&
                            blocker.followUpOwner.name,
                        ) ? (
                          <StatusBadge label="Follow-up planned" tone="accent" />
                        ) : null}
                        <StatusBadge
                          label={`${task.progress.percentage}% checklist done`}
                          tone={task.progress.percentage === 100 ? "success" : "accent"}
                        />
                      </div>
                    </div>

                    <ChecklistList
                      companySlug={companySlug}
                      projectId={project.id}
                      taskId={task.id}
                      items={task.checklistItems}
                      canManage={false}
                      canToggle
                    />

                    {task.appliedImprovements.length > 0 ? (
                      <div className="rounded-[20px] bg-[var(--color-primary-soft)] px-4 py-4">
                        <p className="text-sm font-semibold text-[var(--color-primary)]">
                          Important because of a previous blocker
                        </p>
                        <div className="mt-3 space-y-2">
                          {task.appliedImprovements.map((improvement) => (
                            <div key={improvement.id} className="rounded-[16px] bg-white px-4 py-3">
                              <p className="font-semibold text-[var(--color-foreground)]">
                                {improvement.title}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
                                {improvement.description}
                              </p>
                              {improvement.sourcePreventiveActionTitle ? (
                                <p className="mt-1 text-xs font-medium text-[var(--color-muted-foreground)]">
                                  From prevention: {improvement.sourcePreventiveActionTitle}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <TaskActivityPanel
                      companySlug={companySlug}
                      projectId={project.id}
                      taskId={task.id}
                      viewerRole="EMPLOYEE"
                      notes={task.taskNotes}
                    />

                    <TaskTimelinePanel events={task.timelineEvents} compact />

                    {task.preventiveActions.length > 0 ? (
                      <PreventiveActionPanel
                        companySlug={companySlug}
                        projectId={project.id}
                        taskId={task.id}
                        viewerRole="EMPLOYEE"
                        title="Known guidance for this task"
                        description="These preventive actions come from earlier blockers and can help you avoid the same issue again."
                        actions={task.preventiveActions}
                      />
                    ) : null}

                    <TaskBlockerPanel
                      companySlug={companySlug}
                      projectId={project.id}
                      taskId={task.id}
                      viewerRole="EMPLOYEE"
                      blockers={task.blockers}
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                    No tasks are listed for this project yet. You can still log general project work from My Day.
                  </p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
