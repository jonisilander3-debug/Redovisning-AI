import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.companySlug) {
    redirect("/company-select");
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your company workspace"
      description="Pick up where you left off and keep the business moving with a clear, calm overview."
      asideTitle="Built for everyday business clarity"
      asideDescription="Your company stays at the center. Roles, access, and workspace structure are ready to grow with the product."
    >
      <LoginForm />
    </AuthShell>
  );
}
