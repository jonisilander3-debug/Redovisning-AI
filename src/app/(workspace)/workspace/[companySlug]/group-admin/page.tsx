import { GroupAdminPage } from "@/components/company/group-admin-page";
import { requireGroupAdminAccess } from "@/lib/access";
import { companyTypeOptions } from "@/lib/company-structure";
import { legalFormOptions } from "@/lib/company";
import { getGroupAdminSnapshot } from "@/lib/group-admin";
import { getManageableRoles } from "@/lib/member-management";

export default async function GroupAdminWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireGroupAdminAccess(companySlug);
  const snapshot = await getGroupAdminSnapshot(
    viewer.company.groupId!,
    viewer.company.id,
  );

  return (
    <GroupAdminPage
      companySlug={viewer.company.slug}
      currentCompanyName={viewer.company.name}
      group={snapshot.group}
      summary={snapshot.summary}
      companies={snapshot.companies}
      members={snapshot.members}
      parentCompanyOptions={snapshot.parentCompanyOptions}
      groupCompanyOptions={snapshot.groupCompanyOptions}
      attachableCompanies={snapshot.attachableCompanies}
      companyTypeOptions={companyTypeOptions}
      legalFormOptions={legalFormOptions}
      roleOptions={getManageableRoles()}
      memberOptions={snapshot.memberOptions}
    />
  );
}
