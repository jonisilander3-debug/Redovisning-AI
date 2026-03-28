import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
};

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Option[];
};

export function SelectField({
  label,
  options,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const selectId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2" htmlFor={selectId}>
      <span className="text-sm font-semibold text-[var(--color-foreground)]">
        {label}
      </span>
      <select
        id={selectId}
        className={cn(
          "h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition-shadow focus:ring-4 focus:ring-[color:rgba(37,99,235,0.14)]",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
