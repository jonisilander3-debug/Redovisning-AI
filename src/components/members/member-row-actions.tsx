"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

type MemberRowActionsProps = {
  companySlug: string;
  memberId: string;
  role: string;
  status: string;
  defaultDailyCapacityHours: number;
  salaryType: "HOURLY" | "MONTHLY";
  hourlyRate: number | null;
  monthlySalary: number | null;
  taxPercent: number | null;
  employerContributionRate: number | null;
  bankIban: string | null;
  roleOptions: Array<{ label: string; value: string }>;
  canEdit: boolean;
};

export function MemberRowActions({
  companySlug,
  memberId,
  role,
  status,
  defaultDailyCapacityHours,
  salaryType,
  hourlyRate,
  monthlySalary,
  taxPercent,
  employerContributionRate,
  bankIban,
  roleOptions,
  canEdit,
}: MemberRowActionsProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(role);
  const [capacityHours, setCapacityHours] = useState(String(defaultDailyCapacityHours));
  const [selectedSalaryType, setSelectedSalaryType] = useState(salaryType);
  const [hourlyRateValue, setHourlyRateValue] = useState(
    hourlyRate === null ? "" : String(hourlyRate),
  );
  const [monthlySalaryValue, setMonthlySalaryValue] = useState(
    monthlySalary === null ? "" : String(monthlySalary),
  );
  const [taxPercentValue, setTaxPercentValue] = useState(
    taxPercent === null ? "30" : String(taxPercent),
  );
  const [employerContributionValue, setEmployerContributionValue] = useState(
    employerContributionRate === null ? "31.42" : String(employerContributionRate),
  );
  const [bankIbanValue, setBankIbanValue] = useState(bankIban ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runUpdate(payload: {
    role?: string;
    status?: string;
    defaultDailyCapacityHours?: number;
    salaryType?: "HOURLY" | "MONTHLY";
    hourlyRate?: number;
    monthlySalary?: number;
    taxPercent?: number;
    employerContributionRate?: number;
    bankIban?: string;
  }) {
    setError(null);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/members/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not update that member.");
        return;
      }

      router.refresh();
    });
  }

  if (!canEdit) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-[190px]">
          <SelectField
            label="Role"
            name={`role-${memberId}`}
            options={roleOptions}
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending || selectedRole === role}
            onClick={() => runUpdate({ role: selectedRole })}
          >
            Save role
          </Button>
          {status === "INACTIVE" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => runUpdate({ status: "ACTIVE" })}
            >
              Restore access
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => runUpdate({ status: "INACTIVE" })}
            >
              Remove access
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-[190px]">
          <SelectField
            label="Daily capacity"
            name={`capacity-${memberId}`}
            options={[
              { label: "4 hours", value: "4" },
              { label: "6 hours", value: "6" },
              { label: "8 hours", value: "8" },
              { label: "10 hours", value: "10" },
            ]}
            value={capacityHours}
            onChange={(event) => setCapacityHours(event.target.value)}
            disabled={isPending}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending || Number(capacityHours) === defaultDailyCapacityHours}
          onClick={() =>
            runUpdate({ defaultDailyCapacityHours: Number(capacityHours) })
          }
        >
          Save capacity
        </Button>
      </div>
      <div className="space-y-3 rounded-[20px] bg-[var(--color-surface)] p-4">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">
          Payroll settings
        </p>
        <div className="grid gap-3 xl:grid-cols-6">
          <SelectField
            label="Salary type"
            name={`salary-type-${memberId}`}
            options={[
              { label: "Hourly", value: "HOURLY" },
              { label: "Monthly", value: "MONTHLY" },
            ]}
            value={selectedSalaryType}
            onChange={(event) =>
              setSelectedSalaryType(event.target.value as "HOURLY" | "MONTHLY")
            }
            disabled={isPending}
          />
          <TextField
            label="Hourly rate"
            name={`hourly-rate-${memberId}`}
            type="number"
            min="0"
            step="0.01"
            value={hourlyRateValue}
            onChange={(event) => setHourlyRateValue(event.target.value)}
            disabled={isPending}
          />
          <TextField
            label="Monthly salary"
            name={`monthly-salary-${memberId}`}
            type="number"
            min="0"
            step="0.01"
            value={monthlySalaryValue}
            onChange={(event) => setMonthlySalaryValue(event.target.value)}
            disabled={isPending}
          />
          <TextField
            label="Tax %"
            name={`tax-percent-${memberId}`}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxPercentValue}
            onChange={(event) => setTaxPercentValue(event.target.value)}
            disabled={isPending}
          />
          <TextField
            label="Employer fee %"
            name={`employer-rate-${memberId}`}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={employerContributionValue}
            onChange={(event) => setEmployerContributionValue(event.target.value)}
            disabled={isPending}
          />
          <TextField
            label="Employee IBAN"
            name={`bank-iban-${memberId}`}
            value={bankIbanValue}
            onChange={(event) => setBankIbanValue(event.target.value)}
            disabled={isPending}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={
            isPending ||
            (selectedSalaryType === salaryType &&
              hourlyRateValue === (hourlyRate === null ? "" : String(hourlyRate)) &&
              monthlySalaryValue === (monthlySalary === null ? "" : String(monthlySalary)) &&
              taxPercentValue === (taxPercent === null ? "30" : String(taxPercent)) &&
              bankIbanValue === (bankIban ?? "") &&
              employerContributionValue ===
                (employerContributionRate === null
                  ? "31.42"
                  : String(employerContributionRate)))
          }
          onClick={() =>
            runUpdate({
              salaryType: selectedSalaryType,
              hourlyRate: Number(hourlyRateValue || 0),
              monthlySalary: Number(monthlySalaryValue || 0),
              taxPercent: Number(taxPercentValue || 0),
              employerContributionRate: Number(employerContributionValue || 0),
              bankIban: bankIbanValue,
            })
          }
        >
          Save payroll settings
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
