import { AbsencePage } from "@/components/payroll/absence-page";
import { requireProjectManagementAccess } from "@/lib/access";
import {
  absenceStatusLabels,
  absenceTypeLabels,
  getAbsenceStatusTone,
} from "@/lib/absence";
import { prisma } from "@/lib/prisma";

export default async function AbsenceWorkspacePage({
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
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.absenceEntry.findMany({
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
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <AbsencePage
      companySlug={companySlug}
      members={members.map((member) => ({
        label: member.name,
        value: member.id,
      }))}
      entries={entries.map((entry) => ({
        id: entry.id,
        userName: entry.user.name,
        typeLabel: absenceTypeLabels[entry.type],
        statusLabel: absenceStatusLabels[entry.status],
        statusTone: getAbsenceStatusTone(entry.status),
        startDate: entry.startDate.toISOString(),
        endDate: entry.endDate.toISOString(),
        quantityDays: entry.quantityDays?.toString() ?? null,
        quantityHours: entry.quantityHours?.toString() ?? null,
        note: entry.note,
      }))}
    />
  );
}
