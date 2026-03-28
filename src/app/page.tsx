import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getWorkspaceSessionState } from "@/lib/access";

export default async function Home() {
  const sessionState = await getWorkspaceSessionState();

  if (!sessionState) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lastCompanySlug = cookieStore.get("lastCompanySlug")?.value;
  const activeCompany =
    sessionState.accessibleCompanies.find((company) => company.slug === lastCompanySlug) ??
    sessionState.accessibleCompanies.find(
      (company) => company.slug === sessionState.primaryCompanySlug,
    ) ??
    sessionState.accessibleCompanies[0];

  redirect(`/workspace/${activeCompany.slug}`);
}
