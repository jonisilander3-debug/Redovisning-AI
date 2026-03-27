import { cn } from "@/lib/utils";

type NumberTone = "positive" | "negative" | "neutral";

type NumberDisplayProps = {
  value: string;
  tone?: NumberTone;
  size?: "sm" | "md" | "lg";
  suffix?: string;
};

const toneClasses: Record<NumberTone, string> = {
  positive: "text-[var(--color-success)]",
  negative: "text-[var(--color-danger)]",
  neutral: "text-[var(--color-foreground)]",
};

const sizeClasses = {
  sm: "text-sm",
  md: "text-xl sm:text-2xl",
  lg: "text-3xl sm:text-4xl",
};

export function NumberDisplay({
  value,
  tone = "neutral",
  size = "md",
  suffix,
}: NumberDisplayProps) {
  return (
    <div className={cn("font-semibold tracking-[-0.03em]", toneClasses[tone], sizeClasses[size])}>
      <span>{value}</span>
      {suffix ? <span className="ml-1 text-[0.7em] font-medium">{suffix}</span> : null}
    </div>
  );
}
