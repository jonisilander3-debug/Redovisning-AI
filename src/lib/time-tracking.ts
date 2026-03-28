import { TimeEntryStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const startWorkSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().optional().transform((value) => value || ""),
  note: z.string().trim().max(160).optional().transform((value) => value || ""),
});

export const stopWorkSchema = z.object({
  note: z.string().trim().max(160).optional().transform((value) => value || ""),
});

export const timeFilterSchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  status: z.nativeEnum(TimeEntryStatus).optional(),
  date: z.string().optional(),
});

export function getTimeStatusLabel(status: TimeEntryStatus) {
  return status === "ACTIVE" ? "Working" : "Completed";
}

export function getTimeStatusTone(status: TimeEntryStatus) {
  return status === "ACTIVE" ? "accent" : "success";
}

export function getStartOfLocalDay(input = new Date()) {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate());
}

export function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function formatTimeLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function formatDuration(startTime: Date, endTime?: Date | null) {
  const end = endTime ?? new Date();
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - startTime.getTime()) / 60000),
  );
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours}h ${remainingMinutes.toString().padStart(2, "0")}m`;
}

export async function getActiveTimeEntry(userId: string) {
  return prisma.timeEntry.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          customerName: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
  });
}

export async function getEmployeeTimeSnapshot(userId: string, companyId: string) {
  const activeEntry = await getActiveTimeEntry(userId);
  const todayStart = getStartOfLocalDay();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      companyId,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          customerName: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
    take: 10,
  });

  const todaysEntries = await prisma.timeEntry.findMany({
    where: {
      userId,
      companyId,
      startTime: {
        gte: todayStart,
        lt: tomorrowStart,
      },
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
    },
  });

  const todayMinutes = todaysEntries.reduce((total, entry) => {
    const end = entry.endTime ?? new Date();
    const minutes = Math.max(
      0,
      Math.round((end.getTime() - entry.startTime.getTime()) / 60000),
    );
    return total + minutes;
  }, 0);

  const todaysProjectTotals = todaysEntries.reduce<
    Array<{
      projectId: string | null;
      projectName: string;
      taskId: string | null;
      taskName: string | null;
      minutes: number;
    }>
  >((groups, entry) => {
    const minutes = Math.max(
      0,
      Math.round(((entry.endTime ?? new Date()).getTime() - entry.startTime.getTime()) / 60000),
    );
    const projectId = entry.projectId ?? null;
    const projectName = entry.project?.title ?? "No project selected";
    const taskId = entry.taskId ?? null;
    const taskName = entry.task?.title ?? null;
    const existing = groups.find(
      (group) => group.projectId === projectId && group.taskId === taskId,
    );

    if (existing) {
      existing.minutes += minutes;
      return groups;
    }

    groups.push({
      projectId,
      projectName,
      taskId,
      taskName,
      minutes,
    });
    return groups;
  }, []);

  const assignedProjects = await prisma.project.findMany({
    where: {
      companyId,
      assignments: {
        some: {
          userId,
        },
      },
    },
    orderBy: [{ status: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      customerName: true,
      status: true,
      tasks: {
        where: {
          OR: [{ assignedUserId: userId }, { assignedUserId: null }],
        },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          status: true,
          assignedUserId: true,
        },
      },
    },
  });

  return {
    activeEntry,
    entries,
    todayMinutes,
    todayLabel: formatDateLabel(todayStart),
    todaysProjectTotals,
    assignedProjects,
  };
}

export async function startWorkEntry({
  companyId,
  userId,
  projectId,
  taskId,
  note,
}: {
  companyId: string;
  userId: string;
  projectId: string;
  taskId?: string;
  note?: string;
}) {
  const existingActive = await getActiveTimeEntry(userId);

  if (existingActive) {
    throw new Error("You already have work running.");
  }

  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      userId,
      projectId,
      project: {
        companyId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!assignment) {
    throw new Error("Choose one of your assigned projects before starting work.");
  }

  let resolvedTaskId: string | null = null;

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        companyId,
        OR: [{ assignedUserId: userId }, { assignedUserId: null }],
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      throw new Error("Choose a task available in that project before starting work.");
    }

    resolvedTaskId = task.id;
  }

  const now = new Date();
  const date = getStartOfLocalDay(now);

  return prisma.timeEntry.create({
    data: {
      companyId,
      userId,
      projectId,
      taskId: resolvedTaskId,
      date,
      startTime: now,
      status: "ACTIVE",
      note: note?.trim() || null,
    },
  });
}

export async function stopWorkEntry({
  userId,
  note,
}: {
  userId: string;
  note?: string;
}) {
  const activeEntry = await getActiveTimeEntry(userId);

  if (!activeEntry) {
    throw new Error("There is no active work session to stop.");
  }

  return prisma.timeEntry.update({
    where: { id: activeEntry.id },
    data: {
      endTime: new Date(),
      status: "COMPLETED",
      note: note?.trim() ? note.trim() : activeEntry.note,
    },
  });
}
