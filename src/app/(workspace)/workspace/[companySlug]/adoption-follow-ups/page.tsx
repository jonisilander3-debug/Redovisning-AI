import { CompanyAdoptionFollowUpsPage } from "@/components/company/company-adoption-follow-ups-page";
import { requireGroupAdminAccess } from "@/lib/access";
import { getGroupAdminSnapshot } from "@/lib/group-admin";

export default async function AdoptionFollowUpsWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireGroupAdminAccess(companySlug);
  const snapshot = await getGroupAdminSnapshot(viewer.company.groupId!, viewer.company.id);

  return (
    <CompanyAdoptionFollowUpsPage
      companySlug={viewer.company.slug}
      group={snapshot.group}
      companies={snapshot.companies}
    />
  );
}
