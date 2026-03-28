import { UserRole } from "@prisma/client";
import type { NavItem } from "@/components/layout/sidebar";
import {
  canManageMembers,
  canViewCompanyWorkspace,
} from "@/lib/access";

export function getNavigationItems(
  companySlug: string,
  role: UserRole,
  options?: {
    hasGroupAdmin?: boolean;
  },
): NavItem[] {
  const basePath = `/workspace/${companySlug}`;

  if (!canViewCompanyWorkspace(role)) {
    return [
      { label: "Dashboard", href: basePath },
      { label: "My Day", href: `${basePath}/my-day` },
      { label: "My Work", href: `${basePath}/my-work` },
      { label: "My Payroll", href: `${basePath}/my-payroll` },
    ];
  }

  const items: NavItem[] = [
    { label: "Dashboard", href: basePath },
    { label: "Projects", href: `${basePath}/projects` },
    { label: "Time", href: `${basePath}/time` },
    { label: "Payroll", href: `${basePath}/payroll` },
    { label: "Benefits", href: `${basePath}/payroll/benefits` },
    { label: "Payroll Declarations", href: `${basePath}/payroll/declarations` },
    { label: "Absence", href: `${basePath}/absence` },
    { label: "Customers", href: `${basePath}/customers` },
    { label: "Quotes", href: `${basePath}/quotes` },
    { label: "Billing", href: `${basePath}/billing` },
    { label: "Billing Queue", href: `${basePath}/billing/queue` },
    { label: "Invoices", href: `${basePath}/invoices` },
    { label: "Accounting", href: `${basePath}/accounting` },
    { label: "VAT Reports", href: `${basePath}/accounting/vat` },
    { label: "INK2", href: `${basePath}/accounting/ink2` },
    { label: "Year-end", href: `${basePath}/accounting/year-end` },
    { label: "Payments", href: `${basePath}/accounting/payments` },
    { label: "Planning Board", href: `${basePath}/planning` },
    { label: "Weekly Plan", href: `${basePath}/weekly-plan` },
    { label: "Workload", href: `${basePath}/workload` },
    { label: "Launch Health", href: `${basePath}/launch-health` },
    { label: "Risks", href: `${basePath}/risks` },
    { label: "Follow-ups", href: `${basePath}/follow-ups` },
    { label: "Outcomes", href: `${basePath}/outcomes` },
    { label: "Prevention", href: `${basePath}/prevention` },
    { label: "Templates", href: `${basePath}/templates` },
    { label: "Job Presets", href: `${basePath}/presets` },
  ];

  if (canManageMembers(role)) {
    items.push({ label: "Members", href: `${basePath}/members` });
    items.push({ label: "Company Structure", href: `${basePath}/company-structure` });
    if (options?.hasGroupAdmin) {
      items.push({ label: "Group Admin", href: `${basePath}/group-admin` });
      items.push({ label: "Adoption Follow-ups", href: `${basePath}/adoption-follow-ups` });
    }
  }

  return items;
}
