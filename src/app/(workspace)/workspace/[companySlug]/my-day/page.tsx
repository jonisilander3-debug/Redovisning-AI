import { redirect } from "next/navigation";
import { EmployeeMyDayPage } from "@/components/employee/employee-my-day-page";
import { isEmployeeRole, requireWorkspaceAccess } from "@/lib/access";
import { getEmployeeTimeSnapshot } from "@/lib/time-tracking";

export default async function MyDayPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireWorkspaceAccess(companySlug);

  if (!isEmployeeRole(viewer.role)) {
    redirect(`/workspace/${viewer.company.slug}`);
  }

  const snapshot = await getEmployeeTimeSnapshot(viewer.id, viewer.company.id);

  return (
    <EmployeeMyDayPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      userName={viewer.name ?? viewer.email}
      roleLabel={viewer.roleLabel}
      activeEntry={snapshot.activeEntry}
      entries={snapshot.entries}
      todayMinutes={snapshot.todayMinutes}
      todayLabel={snapshot.todayLabel}
      assignedProjects={snapshot.assignedProjects}
      todaysProjectTotals={snapshot.todaysProjectTotals}
    />
  );
}
