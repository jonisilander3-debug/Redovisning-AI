import { TaskPriority, TaskStatus } from "@prisma/client";
import { WeeklyPlanPage } from "@/components/planning/weekly-plan-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getWeeklyPlanningData, getWorkloadBadgeMap } from "@/lib/workload";

export default async function WeeklyPlanWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{
    userId?: string;
    projectId?: string;
    status?: TaskStatus | "ALL";
    priority?: TaskPriority | "ALL";
    overloadedOnly?: string;
    availableOnly?: string;
  }>;
}) {
  const { companySlug } = await params;
  const rawFilters = await searchParams;
  const viewer = await requireProjectManagementAccess(companySlug);

  const filters = {
    userId: rawFilters.userId,
    projectId: rawFilters.projectId,
    status: rawFilters.status,
    priority: rawFilters.priority,
    overloadedOnly: rawFilters.overloadedOnly === "true",
    availableOnly: rawFilters.availableOnly === "true",
  };

  const [projects, members, planning, workloadMap] = await Promise.all([
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
    getWeeklyPlanningData({
      viewer,
      filters,
    }),
    getWorkloadBadgeMap(viewer),
  ]);

  return (
    <WeeklyPlanPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      weekLabel={planning.weekLabel}
      members={planning.members}
      suggestions={planning.suggestions}
      projectOptions={[
        { label: "All projects", value: "" },
        ...projects.map((project) => ({
          label: project.title,
          value: project.id,
        })),
      ]}
      memberOptions={[
        { label: "Everyone", value: "" },
        ...members.map((member) => ({
          label: member.name,
          value: member.id,
        })),
      ]}
      workloadMap={workloadMap}
    />
  );
}
