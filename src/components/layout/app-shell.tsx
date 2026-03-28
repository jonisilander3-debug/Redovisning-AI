"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, type NavItem } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { WorkspaceViewer } from "@/lib/access";
import { getNavigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  viewer: WorkspaceViewer;
};

export function AppShell({ children, viewer }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const navItems: NavItem[] = getNavigationItems(viewer.company.slug, viewer.role, {
    hasGroupAdmin: Boolean(viewer.company.groupId),
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.55),transparent_28%),radial-gradient(circle_at_top_right,rgba(204,251,241,0.45),transparent_22%),#ffffff]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <div className="hidden w-[292px] shrink-0 lg:block">
          <Sidebar
            items={navItems}
            activeHref={pathname}
            companyName={viewer.company.name}
            roleLabel={viewer.roleLabel}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenMenu={() => setIsMobileNavOpen(true)}
            companyName={viewer.company.name}
            companySlug={viewer.company.slug}
            groupName={viewer.company.groupName}
            userName={viewer.name ?? viewer.email}
            roleLabel={viewer.roleLabel}
            accessibleCompanies={viewer.accessibleCompanies.map((company) => ({
              id: company.id,
              name: company.name,
              slug: company.slug,
              roleLabel: company.roleLabel,
              groupName: company.groupName,
            }))}
            primaryCompanySlug={viewer.primaryCompanySlug}
          />
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/25 transition-opacity lg:hidden",
          isMobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsMobileNavOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[88%] max-w-[320px] transition-transform duration-300 ease-out lg:hidden",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          items={navItems}
          activeHref={pathname}
          companyName={viewer.company.name}
          roleLabel={viewer.roleLabel}
          mobile
          onNavigate={() => setIsMobileNavOpen(false)}
        />
      </div>
    </div>
  );
}
