"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

type CompanyChooserProps = {
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    roleLabel: string;
    groupName: string | null;
    isPrimary: boolean;
  }>;
};

export function CompanyChooser({ companies }: CompanyChooserProps) {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
          Choose your company
        </h2>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          You can access more than one company. Pick the workspace you want to open now.
        </p>
      </div>

      <div className="space-y-4">
        {companies.map((company) => (
          <Card key={company.id} className="space-y-4 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-[var(--color-foreground)]">
                {company.name}
              </p>
              <StatusBadge label={company.roleLabel} tone="primary" />
              {company.isPrimary ? <StatusBadge label="Primary company" tone="success" /> : null}
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {company.groupName || "Standalone company"}
            </p>
            <Button
              type="button"
              disabled={loadingSlug === company.slug}
              onClick={() => {
                setLoadingSlug(company.slug);
                document.cookie = `lastCompanySlug=${company.slug}; path=/; max-age=31536000`;
                window.location.href = `/workspace/${company.slug}`;
              }}
            >
              {loadingSlug === company.slug ? "Opening..." : "Open company"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
