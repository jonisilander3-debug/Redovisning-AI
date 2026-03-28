import Link from "next/link";
import { cn } from "@/lib/utils";

export type NavItem = {
  label: string;
  href: string;
};

type SidebarProps = {
  items: NavItem[];
  activeHref: string;
  companyName: string;
  roleLabel: string;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({
  items,
  activeHref,
  companyName,
  roleLabel,
  mobile = false,
  onNavigate,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-8 bg-white",
        mobile ? "p-5" : "border-r border-[var(--color-border)] px-5 py-6",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-sm font-bold text-white shadow-[0_18px_32px_-22px_rgba(20,184,166,0.9)]">
            NS
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              {companyName}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {roleLabel}
            </p>
          </div>
        </div>
        <p className="max-w-xs text-sm leading-6 text-[var(--color-muted-foreground)]">
          A calm place to plan projects, follow execution, and spot what needs
          attention next.
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[24px] bg-[linear-gradient(180deg,#eff6ff_0%,#f0fdfa_100%)] p-4 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">
          Built for daily operations
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          The project workflow stays lightweight while still covering planning,
          execution, quality, and reuse.
        </p>
      </div>
    </aside>
  );
}
