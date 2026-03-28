import { CompanySwitcher } from "@/components/layout/company-switcher";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";

type TopbarProps = {
  onOpenMenu: () => void;
  companyName: string;
  companySlug: string;
  groupName?: string | null;
  userName: string;
  roleLabel: string;
  accessibleCompanies: Array<{
    id: string;
    name: string;
    slug: string;
    roleLabel: string;
    groupName: string | null;
  }>;
  primaryCompanySlug?: string;
};

export function Topbar({
  onOpenMenu,
  companyName,
  companySlug,
  groupName,
  userName,
  roleLabel,
  accessibleCompanies,
  primaryCompanySlug,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-[var(--color-border)] bg-white/90 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] lg:hidden"
            aria-label="Open navigation"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-4 rounded-full bg-[var(--color-foreground)]" />
              <span className="block h-0.5 w-4 rounded-full bg-[var(--color-foreground)]" />
              <span className="block h-0.5 w-4 rounded-full bg-[var(--color-foreground)]" />
            </span>
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              {companyName}
            </p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">
              Welcome back, {userName}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <CompanySwitcher
            currentCompanySlug={companySlug}
            primaryCompanySlug={primaryCompanySlug}
            companies={accessibleCompanies}
          />
          <Button variant="secondary">{roleLabel}</Button>
          <LogoutButton />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[24px] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)]">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Your operations workspace is ready
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
            Working in {companyName}{groupName ? ` · ${groupName}` : ""}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Projects, planning, delivery follow-through, and quality signals now
            sit on one shared foundation.
          </p>
        </div>
        <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-sm font-bold text-[#0f766e] sm:flex">
          OK
        </div>
      </div>

      {accessibleCompanies.length > 1 ? (
        <div className="sm:hidden">
          <CompanySwitcher
            currentCompanySlug={companySlug}
            primaryCompanySlug={primaryCompanySlug}
            companies={accessibleCompanies}
            mobile
          />
        </div>
      ) : null}
    </header>
  );
}
