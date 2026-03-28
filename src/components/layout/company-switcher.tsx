"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";

type CompanySwitcherProps = {
  currentCompanySlug: string;
  primaryCompanySlug?: string;
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    roleLabel: string;
    groupName: string | null;
  }>;
  mobile?: boolean;
};

export function CompanySwitcher({
  currentCompanySlug,
  primaryCompanySlug,
  companies,
  mobile = false,
}: CompanySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const currentCompany = useMemo(
    () => companies.find((company) => company.slug === currentCompanySlug) ?? companies[0],
    [companies, currentCompanySlug],
  );

  function getCompanyHref(nextCompanySlug: string) {
    const prefix = `/workspace/${currentCompanySlug}`;

    if (pathname.startsWith(prefix)) {
      const suffix = pathname.slice(prefix.length);
      return `/workspace/${nextCompanySlug}${suffix || ""}`;
    }

    return `/workspace/${nextCompanySlug}`;
  }

  if (!currentCompany || companies.length <= 1) {
    return (
      <div className="rounded-[20px] border border-[var(--color-border)] bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
          Active company
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
          {currentCompany?.name ?? "Workspace"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`rounded-[20px] border border-[var(--color-border)] bg-white px-4 py-3 text-left shadow-[var(--shadow-card)] ${
          mobile ? "w-full" : ""
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
          Active company
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
          {currentCompany.name}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {currentCompany.groupName || currentCompany.roleLabel}
        </p>
      </button>

      {isOpen ? (
        <div
          className={`z-30 mt-3 rounded-[24px] border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-card)] ${
            mobile ? "w-full" : "absolute right-0 w-[320px]"
          }`}
        >
          <div className="space-y-2 px-2 pb-2">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Switch company
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Choose the company context you want to work in right now.
            </p>
          </div>
          <div className="space-y-2">
            {companies.map((company) => {
              const isActive = company.slug === currentCompanySlug;

              return (
                <Link
                  key={company.id}
                  href={getCompanyHref(company.slug)}
                  onClick={() => {
                    document.cookie = `lastCompanySlug=${company.slug}; path=/; max-age=31536000`;
                    setIsOpen(false);
                  }}
                  className="block rounded-[20px] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:bg-[var(--color-primary-soft)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {company.name}
                    </p>
                    {isActive ? <StatusBadge label="Current" tone="success" /> : null}
                    {primaryCompanySlug === company.slug ? (
                      <StatusBadge label="Primary" tone="primary" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {company.roleLabel}
                    {company.groupName ? ` | ${company.groupName}` : ""}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
