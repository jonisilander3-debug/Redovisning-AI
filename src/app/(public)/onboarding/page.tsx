import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { authOptions } from "@/lib/auth";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.companySlug) {
    redirect(`/workspace/${session.user.companySlug}`);
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your company workspace"
      description="Set up the company once, choose the legal form, invite the team later, and start from a strong structure that can grow naturally."
      asideTitle="A simple first step"
      asideDescription="You will create the company, choose the legal form, add the organization number, and become the owner of the workspace."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
