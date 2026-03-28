import { redirect } from "next/navigation";
import { EmployeeMyWorkPage } from "@/components/employee/employee-my-work-page";
import { isEmployeeRole, requireWorkspaceAccess } from "@/lib/access";
import { getVisibleProjectsForViewer } from "@/lib/project-management";
import { getProjectKickoffLabel } from "@/lib/project-kickoff";
import { getPlanningWindowLabel, getTaskChecklistProgress, isTaskOverdue } from "@/lib/task-management";
import { getTaskNoteSummary } from "@/lib/task-notes";
import { getTaskTimelineSummary } from "@/lib/task-timeline";

export default async function MyWorkPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireWorkspaceAccess(companySlug);

  if (!isEmployeeRole(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}/projects`);
  }

  const projects = await getVisibleProjectsForViewer(viewer);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <EmployeeMyWorkPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      projects={projects.map((project) => ({
        id: project.id,
        customerName: project.customerName,
        title: project.title,
        description: project.description,
        status: project.status,
        location: project.location,
        kickoffStatus: project.kickoffStatus,
        kickoffStatusLabel: getProjectKickoffLabel(project.kickoffStatus),
        kickoffNotes: project.kickoffNotes,
        kickoffCompletedAt: project.kickoffCompletedAt?.toISOString() ?? null,
        kickoffCompletedByName: project.kickoffCompletedBy?.name ?? null,
        kickoffFocusTasks: project.kickoffFocusTasks.map((focus) => ({
          id: focus.task.id,
          title: focus.task.title,
          assignedUserId: focus.task.assignedUser?.id ?? null,
          assignedUserName: focus.task.assignedUser?.name ?? null,
          status: focus.task.status,
        })),
        activityEvents: project.activityEvents.map((event) => ({
          id: event.id,
          type: event.type,
          title: event.title,
          description: event.description,
          createdAt: event.createdAt.toISOString(),
          userName: event.user?.name ?? null,
        })),
        tasks: project.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          plannedWindowLabel: getPlanningWindowLabel({
            plannedStartDate: task.plannedStartDate,
            plannedEndDate: task.plannedEndDate,
          }),
          isToday:
            Boolean(task.plannedStartDate && task.plannedStartDate.toDateString() === today.toDateString()) ||
            Boolean(task.dueDate && task.dueDate.toDateString() === today.toDateString()),
          isThisWeek:
            Boolean(
              (task.plannedStartDate &&
                task.plannedStartDate >= today &&
                task.plannedStartDate <= weekEnd) ||
                (task.plannedEndDate &&
                  task.plannedEndDate >= today &&
                  task.plannedEndDate <= weekEnd) ||
                (task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd),
            ),
          dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
          isOverdue: isTaskOverdue(task),
          assignedToMe: task.assignedUserId === viewer.id,
          noteSummary: getTaskNoteSummary(task.taskNotes),
          timelineSummary: getTaskTimelineSummary(task.timelineEvents),
          taskNotes: task.taskNotes.map((note) => ({
            id: note.id,
            type: note.type,
            content: note.content,
            createdAt: note.createdAt.toISOString(),
            user: {
              id: note.user.id,
              name: note.user.name,
            },
          })),
          timelineEvents: task.timelineEvents.map((event) => ({
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
          })),
          blockers: task.blockers.map((blocker) => ({
            id: blocker.id,
            title: blocker.title,
            description: blocker.description,
            status: blocker.status,
            severity: blocker.severity,
            followUpAction: blocker.followUpAction,
            followUpDate: blocker.followUpDate?.toISOString().slice(0, 10) ?? null,
            followUpStatus: blocker.followUpStatus,
            lastFollowUpAt: blocker.lastFollowUpAt?.toISOString() ?? null,
            outcomeStatus: blocker.outcomeStatus,
            outcomeSummary: blocker.outcomeSummary,
            verifiedAt: blocker.verifiedAt?.toISOString() ?? null,
            reopenedAt: blocker.reopenedAt?.toISOString() ?? null,
            reopenReason: blocker.reopenReason,
            followUpOwner: blocker.followUpOwner
              ? {
                  id: blocker.followUpOwner.id,
                  name: blocker.followUpOwner.name,
                }
              : null,
            verifiedBy: blocker.verifiedBy
              ? {
                  id: blocker.verifiedBy.id,
                  name: blocker.verifiedBy.name,
                }
              : null,
            createdAt: blocker.createdAt.toISOString(),
            resolvedAt: blocker.resolvedAt?.toISOString() ?? null,
            resolutionNote: blocker.resolutionNote,
            user: {
              id: blocker.user.id,
              name: blocker.user.name,
            },
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
          })),
          preventiveActions: task.preventiveActions.map((action) => ({
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
            sourceBlockerTitle: action.sourceBlocker?.title ?? null,
          })),
          checklistItems: task.checklistItems.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status,
            sortOrder: item.sortOrder,
            sourceLabel: item.sourceExecutionImprovementId
              ? "Added from prevention"
              : null,
            assignedUser: item.assignedUser
              ? {
                  id: item.assignedUser.id,
                  name: item.assignedUser.name,
                }
              : null,
          })),
          appliedImprovements: task.appliedImprovements.map((applied) => ({
            id: applied.id,
            title: applied.executionImprovement.title,
            description: applied.executionImprovement.description,
            targetType: applied.executionImprovement.targetType,
            sourcePreventiveActionTitle:
              applied.executionImprovement.sourcePreventiveAction?.title ?? null,
          })),
          progress: getTaskChecklistProgress(task.checklistItems),
        })),
      }))}
    />
  );
}
