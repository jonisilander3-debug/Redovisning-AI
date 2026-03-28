"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";

type MemberCompanyAccessPanelProps = {
  companySlug: string;
  memberId: string;
  apiBasePath?: string;
  title?: string;
  description?: string;
  accesses: Array<{
    id: string;
    companyId: string;
    companyName: string;
    role: string;
    roleLabel: string;
    groupName: string | null;
    isCurrentCompany: boolean;
    isPrimaryCompany: boolean;
  }>;
  availableCompanies: Array<{
    label: string;
    value: string;
  }>;
  roleOptions: Array<{
    label: string;
    value: string;
  }>;
};

export function MemberCompanyAccessPanel({
  companySlug,
  memberId,
  apiBasePath,
  title = "Company access",
  description = "Give this person access to other companies when needed.",
  accesses,
  availableCompanies,
  roleOptions,
}: MemberCompanyAccessPanelProps) {
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedRole, setSelectedRole] = useState("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const basePath =
    apiBasePath ?? `/api/workspace/${companySlug}/members/${memberId}`;

  function addAccess() {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`${basePath}/company-access`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyId: selectedCompanyId,
            role: selectedRole,
          }),
        });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not add company access.");
        return;
      }

      setSelectedCompanyId("");
      setSelectedRole("EMPLOYEE");
      router.refresh();
    });
  }

  function updateAccess(accessId: string, role: string) {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`${basePath}/company-access/${accessId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update company access.");
        return;
      }

      router.refresh();
    });
  }

  function removeAccess(accessId: string) {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`${basePath}/company-access/${accessId}`, {
          method: "DELETE",
        });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not remove company access.");
        return;
      }

      router.refresh();
    });
  }

  function setPrimaryCompany(companyId: string) {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`${basePath}/primary-company`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ companyId }),
        });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not change the primary company.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-[22px] bg-[var(--color-surface)] p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">
          {title}
        </p>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>

      <div className="space-y-3">
        {accesses.map((access) => (
          <div key={access.id} className="rounded-[18px] bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {access.companyName}
                  </p>
                  {access.isCurrentCompany ? (
                    <StatusBadge label="Current workspace" tone="success" />
                  ) : null}
                  {access.isPrimaryCompany ? (
                    <StatusBadge label="Primary company" tone="primary" />
                  ) : null}
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {access.groupName || "Standalone company"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-10 rounded-2xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)]"
                  defaultValue={access.role}
                  onChange={(event) => updateAccess(access.id, event.target.value)}
                  disabled={isPending}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {!access.isCurrentCompany ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => removeAccess(access.id)}
                  >
                    Remove
                  </Button>
                ) : null}
                {!access.isPrimaryCompany ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => setPrimaryCompany(access.companyId)}
                  >
                    Set primary
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
        <SelectField
          label="Add access to"
          name={`companyAccess-${memberId}`}
          value={selectedCompanyId}
          onChange={(event) => setSelectedCompanyId(event.target.value)}
          options={[{ label: "Choose company", value: "" }, ...availableCompanies]}
        />
        <SelectField
          label="Role in that company"
          name={`companyRole-${memberId}`}
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value)}
          options={roleOptions}
        />
        <div className="flex items-end">
          <Button
            type="button"
            disabled={isPending || !selectedCompanyId}
            onClick={addAccess}
          >
            Add access
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
