import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
};

export function TextAreaField({
  label,
  hint,
  className,
  id,
  ...props
}: TextAreaFieldProps) {
  const areaId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2" htmlFor={areaId}>
      <span className="text-sm font-semibold text-[var(--color-foreground)]">
        {label}
      </span>
      <textarea
        id={areaId}
        className={cn(
          "min-h-28 rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition-shadow placeholder:text-[var(--color-muted-foreground)] focus:ring-4 focus:ring-[color:rgba(37,99,235,0.14)]",
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
