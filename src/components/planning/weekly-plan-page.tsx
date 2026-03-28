import { TaskPriority, TaskStatus } from "@prisma/client";
import { TaskReassignControl } from "@/components/planning/task-reassign-control";
import { WeeklyPlanFilters } from "@/components/planning/weekly-plan-filters";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getTaskPriorityLabel,
  getTaskPriorityTone,
  getTaskStatusLabel,
  getTaskStatusTone,
} from "@/lib/task-management";
import {
  formatHours,
  getCapacityStatusLabel,
  getCapacityStatusTone,
} from "@/lib/workload";

type WeeklyPlanPageProps = {
  companySlug: string;
  companyName: string;
  weekLabel: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    defaultDailyCapacityHours: number;
    weeklyCapacityHours: number;
    recentTrackedHours: number;
    planningLoadHours: number;
    combinedLoadHours: number;
    capacityStatus: "available" | "balanced" | "overloaded";
    tasks: Array<{
      id: string;
      title: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: Date | null;
      plannedStartDate: Date | null;
      plannedEndDate: Date | null;
      projectId: string;
      projectName: string;
      customerName: string;
      checklistCompleted: number;
      checklistTotal: number;
      hasNotes: boolean;
      hasHandoff: boolean;
      timeCount: number;
      taskWindowLabel: string;
      overdue: boolean;
      eligibleAssignees: Array<{
        id: string;
        name: string;
      }>;
    }>;
  }>;
  suggestions: Array<{
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName: string;
    fromMember: {
      id: string;
      name: string;
      capacityStatus: "available" | "balanced" | "overloaded";
    };
    toMember: {
      id: string;
      name: string;
      capacityStatus: "available" | "balanced" | "overloaded";
    };
    reason: string;
  }>;
  projectOptions: Array<{ label: string; value: string }>;
  memberOptions: Array<{ label: string; value: string }>;
  workloadMap: Record<
    string,
    {
      label: string;
      tone: "default" | "primary" | "accent" | "success" | "danger";
    }
  >;
};

export function WeeklyPlanPage({
  companySlug,
  companyName,
  weekLabel,
  members,
  suggestions,
  projectOptions,
  memberOptions,
  workloadMap,
}: WeeklyPlanPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Weekly Plan"
        title="Rebalance the week with confidence"
        description={`${companyName} can now see who is carrying what this week, where overload is building, and where simple reassignment could help.`}
      />

      <Card className="space-y-3">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          This planning window
        </p>
        <p className="text-2xl font-semibold text-[var(--color-foreground)]">
          {weekLabel}
        </p>
      </Card>

      <WeeklyPlanFilters
        memberOptions={memberOptions}
        projectOptions={projectOptions}
      />

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Reassignment suggestions
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            A few practical moves to consider
          </h2>
        </div>

        {suggestions.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {suggestions.map((suggestion) => (
              <Card key={`${suggestion.taskId}-${suggestion.toMember.id}`} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      Consider moving {suggestion.taskTitle}
                    </p>
                    <StatusBadge
                      label={getCapacityStatusLabel(suggestion.fromMember.capacityStatus)}
                      tone={getCapacityStatusTone(suggestion.fromMember.capacityStatus)}
                    />
                    <StatusBadge
                      label={getCapacityStatusLabel(suggestion.toMember.capacityStatus)}
                      tone={getCapacityStatusTone(suggestion.toMember.capacityStatus)}
                    />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {suggestion.projectName}
                  </p>
                  <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                    {suggestion.reason}
                  </p>
                </div>

                <TaskReassignControl
                  companySlug={companySlug}
                  projectId={suggestion.projectId}
                  taskId={suggestion.taskId}
                  currentAssigneeId={suggestion.fromMember.id}
                  currentAssigneeName={suggestion.fromMember.name}
                  eligibleAssignees={[
                    { id: suggestion.fromMember.id, name: suggestion.fromMember.name },
                    { id: suggestion.toMember.id, name: suggestion.toMember.name },
                  ]}
                  workloadMap={workloadMap}
                />
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No clear reassignment suggestions right now. The week looks reasonably balanced with the current rules.
            </p>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Weekly plan by person
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Who is carrying what this week
          </h2>
        </div>

        <div className="space-y-5">
          {members.map((member) => (
            <Card key={member.id} className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                      {member.name}
                    </h3>
                    <StatusBadge
                      label={getCapacityStatusLabel(member.capacityStatus)}
                      tone={getCapacityStatusTone(member.capacityStatus)}
                    />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {member.email}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Weekly load
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                    {formatHours(member.combinedLoadHours)} / {formatHours(member.weeklyCapacityHours)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">This week</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                    {member.tasks.length}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">In progress</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                    {member.tasks.filter((task) => task.status === "IN_PROGRESS").length}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Overdue</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                    {member.tasks.filter((task) => task.overdue).length}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Tracked recently</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                    {formatHours(member.recentTrackedHours)}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Derived load</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                    {formatHours(member.planningLoadHours)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {member.tasks.length > 0 ? (
                  member.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="space-y-4 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[var(--color-foreground)]">
                              {task.title}
                            </p>
                            <StatusBadge
                              label={getTaskStatusLabel(task.status)}
                              tone={getTaskStatusTone(task.status)}
                            />
                            <StatusBadge
                              label={getTaskPriorityLabel(task.priority)}
                              tone={getTaskPriorityTone(task.priority)}
                            />
                            {task.overdue ? <StatusBadge label="Overdue" tone="danger" /> : null}
                            {task.hasHandoff ? (
                              <StatusBadge label="Handoff note" tone="accent" />
                            ) : null}
                            {task.hasNotes ? (
                              <StatusBadge label="Recent note" tone="primary" />
                            ) : null}
                          </div>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {task.customerName} | {task.projectName}
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {task.taskWindowLabel}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white px-4 py-3">
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            Checklist
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                            {task.checklistCompleted}/{task.checklistTotal} complete
                          </p>
                        </div>
                      </div>

                      <TaskReassignControl
                        companySlug={companySlug}
                        projectId={task.projectId}
                        taskId={task.id}
                        currentAssigneeId={member.id}
                        currentAssigneeName={member.name}
                        eligibleAssignees={task.eligibleAssignees}
                        workloadMap={workloadMap}
                      />
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-5 text-sm text-[var(--color-muted-foreground)]">
                    No work is planned for this person in the current weekly filters.
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
