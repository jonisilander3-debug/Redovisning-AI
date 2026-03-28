import { ProjectActivityEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const projectActivityEventLabels: Record<ProjectActivityEventType, string> = {
  KICKOFF_COMPLETED: "Kickoff completed",
};

export function getProjectActivityEventLabel(type: ProjectActivityEventType) {
  return projectActivityEventLabels[type];
}

export function getProjectActivityEventTone(type: ProjectActivityEventType) {
  if (type === "KICKOFF_COMPLETED") {
    return "success" as const;
  }

  return "default" as const;
}

export async function createProjectActivityEvent({
  companyId,
  projectId,
  userId,
  type,
  title,
  description,
  metadata,
}: {
  companyId: string;
  projectId: string;
  userId?: string | null;
  type: ProjectActivityEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
}) {
  return prisma.projectActivityEvent.create({
    data: {
      companyId,
      projectId,
      userId: userId || null,
      type,
      title,
      description: description || null,
      metadata: metadata || undefined,
    },
  });
}

export function getKickoffSummary(project: {
  kickoffStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  kickoffNotes: string | null;
  kickoffCompletedAt: Date | null;
  kickoffCompletedBy: {
    id: string;
    name: string;
  } | null;
  assignments: Array<{
    user: {
      id: string;
      name: string;
      role?: string;
    };
  }>;
  kickoffFocusTasks: Array<{
    sortOrder: number;
    task: {
      id: string;
      title: string;
      status: string;
      assignedUser: {
        id: string;
        name: string;
      } | null;
    };
  }>;
}) {
  const focusTasks = [...project.kickoffFocusTasks]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.task);

  const groupedAssignments = focusTasks.reduce<
    Array<{
      ownerId: string;
      ownerName: string;
      tasks: Array<{
        id: string;
        title: string;
        status: string;
      }>;
    }>
  >((groups, task) => {
    const ownerId = task.assignedUser?.id ?? "unassigned";
    const ownerName = task.assignedUser?.name ?? "Unassigned";
    const existing = groups.find((group) => group.ownerId === ownerId);

    if (existing) {
      existing.tasks.push({
        id: task.id,
        title: task.title,
        status: task.status,
      });
      return groups;
    }

    groups.push({
      ownerId,
      ownerName,
      tasks: [
        {
          id: task.id,
          title: task.title,
          status: task.status,
        },
      ],
    });

    return groups;
  }, []);

  return {
    isCompleted: project.kickoffStatus === "COMPLETED",
    kickoffNotes: project.kickoffNotes,
    kickoffCompletedAt: project.kickoffCompletedAt,
    kickoffCompletedBy: project.kickoffCompletedBy,
    teamMembers: project.assignments.map((assignment) => assignment.user),
    focusTasks,
    groupedAssignments,
  };
}
