import { TimeEntryStatus } from "@prisma/client";
import { AdminTimeOverviewPage } from "@/components/time/admin-time-overview-page";
import { requireCompanyTimeAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type TimePageProps = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{
    userId?: string;
    projectId?: string;
    taskId?: string;
    status?: string;
    date?: string;
  }>;
};

export default async function TimeOverviewPage({
  params,
  searchParams,
}: TimePageProps) {
  const { companySlug } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);
  const filters = await searchParams;

  const dateFilter =
    filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)
      ? new Date(`${filters.date}T00:00:00`)
      : null;

  const nextDate = dateFilter ? new Date(dateFilter) : null;
  if (nextDate) {
    nextDate.setDate(dateFilter!.getDate() + 1);
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId: viewer.company.id,
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.taskId ? { taskId: filters.taskId } : {}),
      ...(filters.status &&
      (filters.status === "ACTIVE" || filters.status === "COMPLETED")
        ? { status: filters.status as TimeEntryStatus }
        : {}),
      ...(dateFilter && nextDate
        ? {
            startTime: {
              gte: dateFilter,
              lt: nextDate,
            },
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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

  const members = await prisma.user.findMany({
    where: {
      companyId: viewer.company.id,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const projects = await prisma.project.findMany({
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
  });

  const tasks = await prisma.task.findMany({
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
  });

  return (
    <AdminTimeOverviewPage
      companyName={viewer.company.name}
      companySlug={viewer.company.slug}
      entries={entries}
      members={members}
      projects={projects}
      tasks={tasks}
      filters={filters}
    />
  );
}
