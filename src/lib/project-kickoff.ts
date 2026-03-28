import { ProjectKickoffStatus, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const projectKickoffLabels: Record<ProjectKickoffStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export const projectKickoffOptions = Object.entries(projectKickoffLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const updateProjectKickoffSchema = z.object({
  kickoffStatus: z.nativeEnum(ProjectKickoffStatus),
  kickoffNotes: z.string().trim().max(800).optional().transform((value) => value || ""),
  assignedUserIds: z.array(z.string()).default([]),
  startDate: z.string().optional().transform((value) => value || ""),
  endDate: z.string().optional().transform((value) => value || ""),
  firstTaskIds: z.array(z.string()).default([]),
});

export function getProjectKickoffLabel(status: ProjectKickoffStatus) {
  return projectKickoffLabels[status];
}

export function getProjectKickoffTone(status: ProjectKickoffStatus) {
  if (status === "COMPLETED") {
    return "success" as const;
  }

  if (status === "IN_PROGRESS") {
    return "accent" as const;
  }

  return "default" as const;
}

export function getProjectReadinessSummary(project: {
  startDate: Date | null;
  endDate: Date | null;
  kickoffStatus: ProjectKickoffStatus;
  assignments: Array<{ user: { id: string; name: string } }>;
  tasks: Array<{ id: string; title: string; status: TaskStatus }>;
}) {
  const hasDates = Boolean(project.startDate && project.endDate);
  const hasTeam = project.assignments.length > 0;
  const activeTasks = project.tasks.filter((task) => task.status !== "DONE");
  const hasInitialTasks = activeTasks.length > 0;
  const readinessItems = [
    {
      key: "team",
      label: hasTeam ? "Team confirmed" : "Add at least one team member",
      complete: hasTeam,
    },
    {
      key: "dates",
      label: hasDates ? "Dates confirmed" : "Set project start and end dates",
      complete: hasDates,
    },
    {
      key: "tasks",
      label: hasInitialTasks ? "First work is assigned" : "Add at least one starting task",
      complete: hasInitialTasks,
    },
    {
      key: "kickoff",
      label:
        project.kickoffStatus === "COMPLETED"
          ? "Kickoff completed"
          : "Complete kickoff to start cleanly",
      complete: project.kickoffStatus === "COMPLETED",
    },
  ];

  const firstTasks = activeTasks.slice(0, 3);
  const completedCount = readinessItems.filter((item) => item.complete).length;

  return {
    isReady: readinessItems.every((item) => item.complete),
    completedCount,
    totalCount: readinessItems.length,
    readinessItems,
    firstTasks,
    teamCount: project.assignments.length,
  };
}
