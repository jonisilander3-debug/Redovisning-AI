import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function TextField({
  label,
  hint,
  className,
  id,
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2" htmlFor={inputId}>
      <span className="text-sm font-semibold text-[var(--color-foreground)]">
        {label}
      </span>
      <input
        id={inputId}
        className={cn(
          "h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition-shadow placeholder:text-[var(--color-muted-foreground)] focus:ring-4 focus:ring-[color:rgba(37,99,235,0.14)]",
          className,
        )}
        {...props}
      />
      {hint ? (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
