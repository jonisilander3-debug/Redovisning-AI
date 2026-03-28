import { BlockerOutcomesPage } from "@/components/blockers/blocker-outcomes-page";
import { requireProjectRiskAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function OutcomesWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectRiskAccess(companySlug);

  const blockers = await prisma.taskBlocker.findMany({
    where: {
      companyId: viewer.company.id,
      OR: [
        { outcomeStatus: { not: "UNVERIFIED" } },
        { reopenedAt: { not: null } },
      ],
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
          title: true,
        },
      },
      verifiedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ reopenedAt: "desc" }, { verifiedAt: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <BlockerOutcomesPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      blockers={blockers.map((blocker) => ({
        id: blocker.id,
        title: blocker.title,
        projectId: blocker.projectId,
        projectTitle: blocker.project.title,
        taskTitle: blocker.task.title,
        severity: blocker.severity,
        outcomeStatus: blocker.outcomeStatus,
        outcomeSummary: blocker.outcomeSummary,
        verifiedByName: blocker.verifiedBy?.name ?? null,
        verifiedAt: formatDateTime(blocker.verifiedAt),
        reopenedAt: formatDateTime(blocker.reopenedAt),
        reopenReason: blocker.reopenReason,
        recurrenceCount: blocker.reopenedAt ? 2 : 1,
      }))}
    />
  );
}
