import { prisma } from "@/lib/prisma";
import { MembersPage } from "@/components/members/members-page";
import { getRoleLabel, requireMemberManagementAccess } from "@/lib/access";

export default async function MembersWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireMemberManagementAccess(companySlug);

  const [members, companies] = await Promise.all([
    prisma.user.findMany({
      where: {
        companyMemberships: {
          some: {
            companyId: viewer.company.id,
          },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        status: true,
        defaultDailyCapacityHours: true,
        salaryType: true,
        hourlyRate: true,
        monthlySalary: true,
        taxPercent: true,
        employerContributionRate: true,
        bankIban: true,
        companyMemberships: {
          include: {
            company: {
              include: {
                group: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),
    prisma.company.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <MembersPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      members={members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role:
          member.companyMemberships.find(
            (membership) => membership.companyId === viewer.company.id,
          )?.role ?? member.role,
        status: member.status,
        defaultDailyCapacityHours: member.defaultDailyCapacityHours,
        salaryType: member.salaryType,
        hourlyRate: member.hourlyRate ? Number(member.hourlyRate.toString()) : null,
        monthlySalary: member.monthlySalary ? Number(member.monthlySalary.toString()) : null,
        taxPercent: member.taxPercent ? Number(member.taxPercent.toString()) : null,
        employerContributionRate: member.employerContributionRate
          ? Number(member.employerContributionRate.toString())
          : null,
        bankIban: member.bankIban,
        primaryCompanyId: member.companyId,
        companyAccesses: member.companyMemberships.map((membership) => ({
          id: membership.id,
          companyId: membership.company.id,
          companyName: membership.company.name,
          role: membership.role,
          roleLabel: getRoleLabel(membership.role),
          groupName: membership.company.group?.name ?? null,
          isCurrentCompany: membership.company.id === viewer.company.id,
          isPrimaryCompany: membership.company.id === member.companyId,
        })),
      }))}
      canManage
      availableCompanies={companies.map((company) => ({
        label: `${company.name}${company.group ? ` - ${company.group.name}` : ""}`,
        value: company.id,
      }))}
    />
  );
}
