import { Button } from "@/components/ui/button";

type TopbarProps = {
  onOpenMenu: () => void;
};

export function Topbar({ onOpenMenu }: TopbarProps) {
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
              Overview
            </p>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">
              Good afternoon
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Button variant="secondary">View reports</Button>
          <Button>Create update</Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[24px] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)]">
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Business health looks steady
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Cash flow is stable, team rhythm is healthy, and only a few items
            need attention today.
          </p>
        </div>
        <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-sm font-bold text-[#0f766e] sm:flex">
          OK
        </div>
      </div>
    </header>
  );
}
