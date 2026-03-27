import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  elevated?: boolean;
};

export function Card({
  children,
  className,
  elevated = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        elevated ? "app-card-strong" : "app-card",
        "p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
