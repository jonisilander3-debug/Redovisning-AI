import { TaskPriority, TaskStatus } from "@prisma/client";
import { TaskBoardPage } from "@/components/planning/task-board-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getPlanningTasksForViewer } from "@/lib/task-management";
import { getWorkloadBadgeMap } from "@/lib/workload";

export default async function PlanningWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{
    projectId?: string;
    assignedUserId?: string;
    status?: TaskStatus | "ALL";
    priority?: TaskPriority | "ALL";
    dateScope?: "ALL" | "UPCOMING" | "OVERDUE" | "SCHEDULED";
  }>;
}) {
  const { companySlug } = await params;
  const filters = await searchParams;
  const viewer = await requireProjectManagementAccess(companySlug);

  const [projects, teamMembers, tasks, assigneeWorkload] = await Promise.all([
    prisma.project.findMany({
      where: {
        companyId: viewer.company.id,
      },
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.user.findMany({
      where: {
        companyId: viewer.company.id,
        status: {
          not: "INACTIVE",
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    getPlanningTasksForViewer({
      viewer,
      filters,
    }),
    getWorkloadBadgeMap(viewer),
  ]);

  return (
    <TaskBoardPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      tasks={tasks}
      projectOptions={[
        { label: "All projects", value: "" },
        ...projects.map((project) => ({
          label: project.title,
          value: project.id,
        })),
      ]}
      teamOptions={[
        { label: "Anyone", value: "" },
        ...teamMembers.map((member) => ({
          label: `${member.name}${assigneeWorkload[member.id] ? ` · ${assigneeWorkload[member.id].label}` : ""}`,
          value: member.id,
        })),
      ]}
      assigneeWorkload={assigneeWorkload}
    />
  );
}
