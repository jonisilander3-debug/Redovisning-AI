import { BlockerFollowUpStatus, BlockerSeverity } from "@prisma/client";
import { FollowUpOverviewPage } from "@/components/blockers/follow-up-overview-page";
import { requireProjectRiskAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function FollowUpsWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{
    ownerId?: string;
    projectId?: string;
    followUpStatus?: BlockerFollowUpStatus;
    severity?: BlockerSeverity;
    overdueOnly?: string;
  }>;
}) {
  const { companySlug } = await params;
  const filters = await searchParams;
  const viewer = await requireProjectRiskAccess(companySlug);
  const overdueOnly = filters.overdueOnly === "true";
  const today = new Date();

  const [projects, owners, blockers] = await Promise.all([
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
    prisma.taskBlocker.findMany({
      where: {
        companyId: viewer.company.id,
        status: "OPEN",
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.ownerId ? { followUpOwnerId: filters.ownerId } : {}),
        ...(filters.followUpStatus ? { followUpStatus: filters.followUpStatus } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(overdueOnly
          ? {
              followUpDate: {
                lt: today,
              },
              NOT: {
                followUpStatus: "DONE",
              },
            }
          : {}),
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
      },
      orderBy: [{ severity: "desc" }, { followUpDate: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <FollowUpOverviewPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      filters={{
        ownerId: filters.ownerId,
        projectId: filters.projectId,
        followUpStatus: filters.followUpStatus,
        severity: filters.severity,
        overdueOnly,
      }}
      ownerOptions={owners.map((owner) => ({
        label: owner.name,
        value: owner.id,
      }))}
      projectOptions={projects.map((project) => ({
        label: project.title,
        value: project.id,
      }))}
      blockers={blockers.map((blocker) => ({
        id: blocker.id,
        title: blocker.title,
        description: blocker.description,
        status: blocker.status,
        severity: blocker.severity,
        followUpAction: blocker.followUpAction,
        followUpDate: blocker.followUpDate?.toISOString().slice(0, 10) ?? null,
        followUpStatus: blocker.followUpStatus,
        projectId: blocker.project.id,
        projectTitle: blocker.project.title,
        taskId: blocker.task.id,
        taskTitle: blocker.task.title,
        reporterName: blocker.user.name,
        followUpOwnerName: blocker.followUpOwner?.name ?? null,
        overdueFollowUp: Boolean(
          blocker.followUpDate &&
            blocker.followUpDate < today &&
            blocker.followUpStatus !== "DONE",
        ),
      }))}
    />
  );
}
