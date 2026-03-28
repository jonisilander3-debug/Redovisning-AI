import { TaskStatus } from "@prisma/client";
import { WorkloadPage } from "@/components/workload/workload-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getCompanyWorkloadSummary } from "@/lib/workload";

export default async function WorkloadWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{
    userId?: string;
    projectId?: string;
    status?: TaskStatus | "ALL";
    dateScope?: "ALL" | "UPCOMING" | "OVERDUE" | "SCHEDULED";
  }>;
}) {
  const { companySlug } = await params;
  const filters = await searchParams;
  const viewer = await requireProjectManagementAccess(companySlug);

  const [projects, members, summaries] = await Promise.all([
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
    getCompanyWorkloadSummary({
      viewer,
      filters,
    }),
  ]);

  return (
    <WorkloadPage
      companyName={viewer.company.name}
      summaries={summaries}
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
    />
  );
}
