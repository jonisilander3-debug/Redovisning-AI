"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar, type NavItem } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Customers", href: "#customers" },
  { label: "Projects", href: "#projects" },
  { label: "Time", href: "#time" },
  { label: "Receipts", href: "#receipts" },
  { label: "Invoice Drafts", href: "#invoice-drafts" },
  { label: "Accounting", href: "#accounting" },
  { label: "Payroll", href: "#payroll" },
  { label: "Backoffice", href: "#backoffice" },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.55),transparent_28%),radial-gradient(circle_at_top_right,rgba(204,251,241,0.45),transparent_22%),#ffffff]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <div className="hidden w-[292px] shrink-0 lg:block">
          <Sidebar items={navItems} activeHref="#dashboard" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={() => setIsMobileNavOpen(true)} />
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
          activeHref="#dashboard"
          mobile
          onNavigate={() => setIsMobileNavOpen(false)}
        />
      </div>
    </div>
  );
}
