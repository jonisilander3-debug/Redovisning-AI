import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { CompanyChooser } from "@/components/auth/company-chooser";
import { getWorkspaceSessionState } from "@/lib/access";

export default async function CompanySelectPage() {
  const sessionState = await getWorkspaceSessionState();

  if (!sessionState) {
    redirect("/login");
  }

  if (sessionState.accessibleCompanies.length === 1) {
    redirect(`/workspace/${sessionState.accessibleCompanies[0].slug}`);
  }

  const cookieStore = await cookies();
  const lastCompanySlug = cookieStore.get("lastCompanySlug")?.value;

  if (
    lastCompanySlug &&
    sessionState.accessibleCompanies.some((company) => company.slug === lastCompanySlug)
  ) {
    redirect(`/workspace/${lastCompanySlug}`);
  }

  return (
    <AuthShell
      eyebrow="Choose company"
      title="Open the right company workspace"
      description="If you work across several companies, choose the one you want to continue in right now."
      asideTitle="Smooth company switching"
      asideDescription="Your last active company is remembered when possible, and your primary company stays available as the safe fallback."
    >
      <CompanyChooser
        companies={sessionState.accessibleCompanies.map((company) => ({
          id: company.id,
          name: company.name,
          slug: company.slug,
          roleLabel: company.roleLabel,
          groupName: company.groupName,
          isPrimary: company.slug === sessionState.primaryCompanySlug,
        }))}
      />
    </AuthShell>
  );
}
