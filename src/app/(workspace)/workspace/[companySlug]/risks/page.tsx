import { ProjectRiskOverviewPage } from "@/components/projects/project-risk-overview-page";
import { requireProjectRiskAccess } from "@/lib/access";
import { getProjectRiskSummary } from "@/lib/project-risk";
import { prisma } from "@/lib/prisma";

export default async function RisksWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectRiskAccess(companySlug);

  const projects = await prisma.project.findMany({
    where: {
      companyId: viewer.company.id,
    },
    select: {
      id: true,
      customerName: true,
      title: true,
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          plannedStartDate: true,
          plannedEndDate: true,
          createdAt: true,
          updatedAt: true,
          blockers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
              followUpOwner: {
                select: {
                  id: true,
                  name: true,
                },
              },
              verifiedBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
              preventiveActions: {
                select: {
                  status: true,
                },
              },
            },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          },
          timelineEvents: {
            select: {
              type: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      preventiveActions: {
        select: {
          status: true,
          dueDate: true,
        },
      },
      executionImprovements: {
        select: {
          status: true,
          appliesToFutureTasks: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const projectSummaries = projects
    .map((project) => {
      const risk = getProjectRiskSummary(project);
      const topBlockers = project.tasks
        .flatMap((task) => task.blockers)
        .filter((blocker) => blocker.status === "OPEN")
        .slice(0, 3)
        .map((blocker) => ({
          id: blocker.id,
          title: blocker.title,
          severity: blocker.severity,
          reporterName: blocker.user.name,
        }));

      return {
        id: project.id,
        customerName: project.customerName,
        title: project.title,
        ...risk,
        topBlockers,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <ProjectRiskOverviewPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      projects={projectSummaries}
    />
  );
}
