import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideDescription: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  asideTitle,
  asideDescription,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.55),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(204,251,241,0.45),transparent_22%),#ffffff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="app-card-strong flex flex-col justify-between p-8 sm:p-10">
          <div className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-sm font-bold text-white">
              NS
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                {eyebrow}
              </p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
                {title}
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--color-muted-foreground)]">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-lg font-semibold text-[var(--color-foreground)]">
              {asideTitle}
            </p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-muted-foreground)]">
              {asideDescription}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Company first
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
                  One workspace per business, ready for multiple people.
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Role aware
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
                  Owner, admin, manager, and employee are built into the session.
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Ready to grow
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
                  Future portals can branch from the same secure foundation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="app-card flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-xl">{children}</div>
        </section>
      </div>
    </div>
  );
}
