import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.8)] hover:bg-[#1d4ed8]",
  secondary:
    "bg-white text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]",
  ghost:
    "bg-transparent text-[var(--color-muted-foreground)] hover:bg-white hover:text-[var(--color-foreground)]",
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
