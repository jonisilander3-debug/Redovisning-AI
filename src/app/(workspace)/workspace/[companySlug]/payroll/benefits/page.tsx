import { BenefitsPage } from "@/components/payroll/benefits-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { benefitStatusLabels, benefitTypeLabels, getBenefitStatusTone } from "@/lib/benefits";
import { prisma } from "@/lib/prisma";

export default async function PayrollBenefitsPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const [members, entries] = await Promise.all([
    prisma.user.findMany({
      where: {
        companyMemberships: {
          some: {
            companyId: viewer.company.id,
          },
        },
        status: {
          not: "INACTIVE",
        },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.benefitEntry.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <BenefitsPage
      companySlug={companySlug}
      members={members.map((member) => ({
        value: member.id,
        label: `${member.name} (${member.email})`,
      }))}
      entries={entries.map((entry) => ({
        id: entry.id,
        userName: entry.user.name,
        typeLabel: benefitTypeLabels[entry.type],
        statusLabel: benefitStatusLabels[entry.status],
        statusTone: getBenefitStatusTone(entry.status),
        description: entry.description,
        taxableAmount: entry.taxableAmount.toString(),
        date: entry.date.toISOString(),
      }))}
    />
  );
}
