import { AccountingSuggestionsPage } from "@/components/accounting/accounting-suggestions-page";
import { requireCompanyTimeAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceAccountingSuggestionsPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const [suggestions, accounts, projects] = await Promise.all([
    prisma.accountingSuggestion.findMany({
      where: {
        companyId: viewer.company.id,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.account.findMany({
      where: {
        companyId: viewer.company.id,
      },
      orderBy: {
        number: "asc",
      },
      select: {
        id: true,
        number: true,
        name: true,
      },
    }),
    prisma.project.findMany({
      where: {
        companyId: viewer.company.id,
      },
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  const materialIds = suggestions
    .filter((item) => item.sourceType === "MATERIAL")
    .map((item) => item.sourceId);
  const payrollIds = suggestions
    .filter((item) => item.sourceType === "PAYROLL")
    .map((item) => item.sourceId);

  const [materials, payrollRuns] = await Promise.all([
    materialIds.length > 0
      ? prisma.materialEntry.findMany({
          where: {
            id: {
              in: materialIds,
            },
          },
          select: {
            id: true,
            description: true,
            supplierName: true,
          },
        })
      : [],
    payrollIds.length > 0
      ? prisma.payrollRun.findMany({
          where: {
            id: {
              in: payrollIds,
            },
          },
          select: {
            id: true,
            title: true,
          },
        })
      : [],
  ]);

  const materialMap = new Map(materials.map((item) => [item.id, item]));
  const payrollMap = new Map(payrollRuns.map((item) => [item.id, item]));

  return (
    <AccountingSuggestionsPage
      companySlug={viewer.company.slug}
      suggestions={suggestions.map((suggestion) => {
        const material = materialMap.get(suggestion.sourceId);
        const payrollRun = payrollMap.get(suggestion.sourceId);

        return {
          id: suggestion.id,
          sourceType: suggestion.sourceType as "MATERIAL" | "PAYROLL" | "MANUAL",
          sourceId: suggestion.sourceId,
          sourceLabel:
            suggestion.sourceType === "MATERIAL"
              ? material?.description ?? "Materialunderlag"
              : suggestion.sourceType === "PAYROLL"
                ? payrollRun?.title ?? "Loneunderlag"
                : "Manuellt underlag",
          sourceDescription:
            suggestion.sourceType === "MATERIAL"
              ? material?.supplierName
                ? `Leverantor: ${material.supplierName}`
                : "Leverantor saknas i underlaget."
              : suggestion.sourceType === "PAYROLL"
                ? "Lon som behover granskning innan bokforing."
                : "Manuellt underlag som behover granskning.",
          suggestedAccountId: suggestion.suggestedAccountId,
          suggestedVatRate: suggestion.suggestedVatRate?.toString() ?? null,
          suggestedProjectId: suggestion.suggestedProjectId,
          confidenceScore: suggestion.confidenceScore,
          reasoning: suggestion.reasoning,
          status: suggestion.status,
        };
      })}
      accountOptions={accounts.map((account) => ({
        label: `${account.number} - ${account.name}`,
        value: account.id,
      }))}
      projectOptions={projects.map((project) => ({
        label: project.title,
        value: project.id,
      }))}
    />
  );
}
