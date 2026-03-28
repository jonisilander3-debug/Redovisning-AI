import { ProjectEarlyPhaseOverviewPage } from "@/components/projects/project-early-phase-overview-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { getProjectEarlyPhaseSummary } from "@/lib/project-early-phase";
import { prisma } from "@/lib/prisma";

export default async function LaunchHealthWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const projects = await prisma.project.findMany({
    where: {
      companyId: viewer.company.id,
      kickoffStatus: "COMPLETED",
    },
    select: {
      id: true,
      customerName: true,
      title: true,
      kickoffStatus: true,
      kickoffCompletedAt: true,
      kickoffFocusTasks: {
        select: {
          sortOrder: true,
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          plannedStartDate: true,
          plannedEndDate: true,
          updatedAt: true,
          assignedUser: {
            select: {
              id: true,
              name: true,
            },
          },
          checklistItems: {
            select: {
              status: true,
            },
          },
          blockers: {
            select: {
              status: true,
              severity: true,
              followUpStatus: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const summaries = projects
    .map((project) => ({
      id: project.id,
      customerName: project.customerName,
      title: project.title,
      ...getProjectEarlyPhaseSummary(project),
    }))
    .filter((project) => project.isInEarlyPhase)
    .sort((a, b) => {
      const scoreA =
        (a.level === "off_track" ? 3 : a.level === "attention" ? 2 : 1) * 100 +
        a.overdue * 10 +
        a.blocked * 10;
      const scoreB =
        (b.level === "off_track" ? 3 : b.level === "attention" ? 2 : 1) * 100 +
        b.overdue * 10 +
        b.blocked * 10;
      return scoreB - scoreA;
    });

  return (
    <ProjectEarlyPhaseOverviewPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      projects={summaries}
    />
  );
}
