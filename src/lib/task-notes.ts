import { TaskNoteType, UserRole } from "@prisma/client";
import { z } from "zod";
import { canManageProjects, type WorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const taskNoteTypeLabels: Record<TaskNoteType, string> = {
  COMMENT: "Comment",
  HANDOFF: "Handoff",
  MANAGER_NOTE: "Manager note",
  PROGRESS_UPDATE: "Progress update",
};

export const createTaskNoteSchema = z.object({
  type: z.nativeEnum(TaskNoteType),
  content: z.string().trim().min(2).max(1000),
});

export function getTaskNoteTypeLabel(type: TaskNoteType) {
  return taskNoteTypeLabels[type];
}

export function getTaskNoteTone(type: TaskNoteType) {
  if (type === "HANDOFF") {
    return "accent" as const;
  }

  if (type === "MANAGER_NOTE") {
    return "primary" as const;
  }

  if (type === "PROGRESS_UPDATE") {
    return "success" as const;
  }

  return "default" as const;
}

export function getAvailableTaskNoteTypes(role: UserRole) {
  const base = [
    { value: "COMMENT", label: getTaskNoteTypeLabel("COMMENT") },
    { value: "PROGRESS_UPDATE", label: getTaskNoteTypeLabel("PROGRESS_UPDATE") },
    { value: "HANDOFF", label: getTaskNoteTypeLabel("HANDOFF") },
  ] as const;

  if (canManageProjects(role)) {
    return [
      ...base,
      { value: "MANAGER_NOTE", label: getTaskNoteTypeLabel("MANAGER_NOTE") },
    ];
  }

  return base;
}

export function canCreateTaskNoteType(role: UserRole, type: TaskNoteType) {
  if (type === "MANAGER_NOTE") {
    return canManageProjects(role);
  }

  return true;
}

export async function ensureTaskNoteAccess({
  viewer,
  companyId,
  projectId,
  taskId,
}: {
  viewer: WorkspaceViewer;
  companyId: string;
  projectId: string;
  taskId: string;
}) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      companyId,
      projectId,
      ...(canManageProjects(viewer.role)
        ? {}
        : {
            project: {
              assignments: {
                some: {
                  userId: viewer.id,
                },
              },
            },
          }),
    },
    select: {
      id: true,
      title: true,
      projectId: true,
    },
  });
}

export function getTaskNoteSummary(
  notes: Array<{
    type: TaskNoteType;
    createdAt: Date;
  }>,
) {
  if (notes.length === 0) {
    return {
      hasNotes: false,
      hasHandoff: false,
      latestType: null,
      latestAt: null,
    };
  }

  const latest = [...notes].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];

  return {
    hasNotes: true,
    hasHandoff: notes.some((note) => note.type === "HANDOFF"),
    latestType: latest.type,
    latestAt: latest.createdAt,
  };
}
