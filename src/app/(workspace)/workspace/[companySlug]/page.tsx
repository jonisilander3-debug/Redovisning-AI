import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { isEmployeeRole, requireWorkspaceAccess } from "@/lib/access";
import { redirect } from "next/navigation";

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireWorkspaceAccess(companySlug);

  if (isEmployeeRole(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}/my-day`);
  }

  return (
    <DashboardPage
      companyName={viewer.company.name}
      userName={viewer.name ?? viewer.email}
      roleLabel={viewer.roleLabel}
    />
  );
}
