import { Card } from "@/components/ui/card";
import { NumberDisplay } from "@/components/ui/number-display";
import { StatusBadge } from "@/components/ui/status-badge";

type KpiCardProps = {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "negative" | "neutral";
  badge: string;
};

export function KpiCard({
  label,
  value,
  change,
  tone,
  badge,
}: KpiCardProps) {
  return (
    <Card elevated className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <div className="mt-3">
            <NumberDisplay value={value} tone={tone} size="lg" />
          </div>
        </div>
        <StatusBadge
          label={badge}
          tone={tone === "positive" ? "success" : tone === "negative" ? "danger" : "primary"}
        />
      </div>
      <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
        {change}
      </p>
    </Card>
  );
}
