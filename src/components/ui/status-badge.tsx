import { cn } from "@/lib/utils";

type StatusTone = "default" | "primary" | "accent" | "success" | "danger";

const toneClasses: Record<StatusTone, string> = {
  default: "bg-white text-[var(--color-muted-foreground)] border-[var(--color-border)]",
  primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-transparent",
  accent: "bg-[var(--color-accent-soft)] text-[#0f766e] border-transparent",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent",
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({
  label,
  tone = "default",
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.02em]",
        toneClasses[tone],
      )}
    >
      {label}
    </span>
  );
}
