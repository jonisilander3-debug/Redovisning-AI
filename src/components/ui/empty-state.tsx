import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex min-h-52 flex-col items-start justify-center gap-4 border-dashed">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary)]">
        NS
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          {title}
        </h3>
        <p className="max-w-md text-sm leading-6 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>
      {action}
    </Card>
  );
}
