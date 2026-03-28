import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspaceAccess } from "@/lib/access";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireWorkspaceAccess(companySlug);

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
