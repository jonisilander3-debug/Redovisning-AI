import {
  AccountingSuggestionStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import {
  createJournalEntryFromMaterialInDb,
  createJournalEntryFromPayrollRunInDb,
  seedDefaultAccounts,
} from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

export const accountingSuggestionStatusLabels: Record<AccountingSuggestionStatus, string> = {
  PENDING: "Granskning kravs",
  ACCEPTED: "Accepterad",
  REJECTED: "Avvisad",
};

export function getAccountingSuggestionStatusTone(status: AccountingSuggestionStatus) {
  if (status === "ACCEPTED") {
    return "success" as const;
  }
  if (status === "REJECTED") {
    return "danger" as const;
  }
  return "accent" as const;
}

export const reviewAccountingSuggestionSchema = z.object({
  action: z.enum(["ACCEPT", "EDIT_AND_POST", "REJECT"]),
  suggestedAccountId: z.string().optional().transform((value) => value || ""),
  suggestedVatRate: z.coerce.number().min(0).max(100).optional(),
  suggestedProjectId: z.string().optional().transform((value) => value || ""),
  reasoning: z.string().trim().max(500).optional().transform((value) => value || ""),
});

function clampConfidence(value: number) {
  return Math.max(0.05, Math.min(0.99, value));
}

async function getAccountIdByNumber(companyId: string, number: string) {
  await seedDefaultAccounts(companyId);
  const account = await prisma.account.findFirst({
    where: {
      companyId,
      number,
    },
    select: {
      id: true,
    },
  });

  return account?.id ?? null;
}

function getMaterialSuggestionHeuristic(description: string) {
  const normalized = description.toLowerCase();

  if (normalized.includes("hyra")) {
    return {
      accountNumber: "5010",
      confidence: 0.78,
      reasoning: "Beskrivningen liknar hyra eller lokalrelaterad kostnad.",
    };
  }

  if (
    normalized.includes("inventarie") ||
    normalized.includes("verktyg") ||
    normalized.includes("tool")
  ) {
    return {
      accountNumber: "5410",
      confidence: 0.76,
      reasoning: "Beskrivningen pekar mot forbrukningsinventarie eller verktyg.",
    };
  }

  return {
    accountNumber: "4010",
    confidence: 0.85,
    reasoning: "Standardregel for materialinkop anvandes.",
  };
}

export async function createMaterialAccountingSuggestion(materialEntryId: string) {
  const material = await prisma.materialEntry.findUnique({
    where: {
      id: materialEntryId,
    },
    select: {
      id: true,
      companyId: true,
      projectId: true,
      description: true,
      supplierName: true,
      vatRate: true,
      accountingStatus: true,
      journalEntryId: true,
    },
  });

  if (!material) {
    throw new Error("That material entry could not be found.");
  }

  if (material.journalEntryId) {
    return null;
  }

  const existing = await prisma.accountingSuggestion.findFirst({
    where: {
      companyId: material.companyId,
      sourceType: "MATERIAL",
      sourceId: material.id,
      status: "PENDING",
    },
  });

  if (existing) {
    return existing;
  }

  const heuristic = getMaterialSuggestionHeuristic(material.description);
  let confidence = heuristic.confidence;
  const reasons = [heuristic.reasoning];

  if (!material.supplierName) {
    confidence -= 0.22;
    reasons.push("Leverantor saknas, sa underlaget ar inte komplett for autobokning.");
  }

  if (!material.vatRate) {
    confidence -= 0.2;
    reasons.push("Momssats saknas och maste granskas manuellt.");
  }

  const accountId = await getAccountIdByNumber(material.companyId, heuristic.accountNumber);

  const suggestion = await prisma.accountingSuggestion.create({
    data: {
      companyId: material.companyId,
      sourceType: "MATERIAL",
      sourceId: material.id,
      suggestedAccountId: accountId,
      suggestedVatRate: material.vatRate ?? new Prisma.Decimal(25),
      suggestedProjectId: material.projectId,
      confidenceScore: clampConfidence(confidence),
      reasoning: reasons.join(" "),
      status: "PENDING",
    },
  });

  await prisma.materialEntry.update({
    where: {
      id: material.id,
    },
    data: {
      accountingStatus: "SUGGESTED",
    },
  });

  return suggestion;
}

export async function createPayrollAccountingSuggestion(payrollRunId: string) {
  const payrollRun = await prisma.payrollRun.findUnique({
    where: {
      id: payrollRunId,
    },
    select: {
      id: true,
      companyId: true,
      totalGross: true,
      totalEmployerContribution: true,
      totalTax: true,
      totalNet: true,
      journalEntryId: true,
    },
  });

  if (!payrollRun) {
    throw new Error("That payroll run could not be found.");
  }

  if (payrollRun.journalEntryId) {
    return null;
  }

  const existing = await prisma.accountingSuggestion.findFirst({
    where: {
      companyId: payrollRun.companyId,
      sourceType: "PAYROLL",
      sourceId: payrollRun.id,
      status: "PENDING",
    },
  });

  if (existing) {
    return existing;
  }

  const confidence =
    Number(payrollRun.totalGross.toString()) > 0 &&
    Number(payrollRun.totalEmployerContribution.toString()) >= 0 &&
    Number(payrollRun.totalTax.toString()) >= 0
      ? 0.82
      : 0.42;

  return prisma.accountingSuggestion.create({
    data: {
      companyId: payrollRun.companyId,
      sourceType: "PAYROLL",
      sourceId: payrollRun.id,
      confidenceScore: clampConfidence(confidence),
      reasoning:
        confidence > 0.7
          ? "Standardforslag for lonebokning finns klart och kan granskas innan postning."
          : "Loneunderlaget verkar ofullstandigt och bor granskas manuellt.",
      status: "PENDING",
    },
  });
}

export async function reviewAccountingSuggestion({
  companyId,
  suggestionId,
  reviewerId,
  input,
}: {
  companyId: string;
  suggestionId: string;
  reviewerId: string;
  input: z.infer<typeof reviewAccountingSuggestionSchema>;
}) {
  return prisma.$transaction(async (tx) => {
    const suggestion = await tx.accountingSuggestion.findFirst({
      where: {
        id: suggestionId,
        companyId,
      },
    });

    if (!suggestion) {
      throw new Error("That accounting suggestion could not be found.");
    }

    if (suggestion.status !== "PENDING") {
      throw new Error("That suggestion has already been handled.");
    }

    if (input.action === "REJECT") {
      const updated = await tx.accountingSuggestion.update({
        where: {
          id: suggestion.id,
        },
        data: {
          status: "REJECTED",
          reviewedByUserId: reviewerId,
          reviewedAt: new Date(),
          reasoning: input.reasoning || suggestion.reasoning,
        },
      });

      if (suggestion.sourceType === "MATERIAL") {
        await tx.materialEntry.updateMany({
          where: {
            id: suggestion.sourceId,
            companyId,
          },
          data: {
            accountingStatus: "UNREVIEWED",
          },
        });
      }

      return { suggestion: updated, journalEntry: null };
    }

    if (suggestion.sourceType === "MATERIAL") {
      const material = await tx.materialEntry.findFirst({
        where: {
          id: suggestion.sourceId,
          companyId,
        },
      });

      if (!material) {
        throw new Error("The material linked to this suggestion could not be found.");
      }

      if (input.suggestedAccountId || typeof input.suggestedVatRate === "number") {
        await tx.accountingSuggestion.update({
          where: {
            id: suggestion.id,
          },
          data: {
            suggestedAccountId: input.suggestedAccountId || suggestion.suggestedAccountId,
            suggestedVatRate:
              typeof input.suggestedVatRate === "number"
                ? new Prisma.Decimal(input.suggestedVatRate)
                : suggestion.suggestedVatRate,
            suggestedProjectId: input.suggestedProjectId || suggestion.suggestedProjectId,
            reasoning: input.reasoning || suggestion.reasoning,
          },
        });

        await tx.materialEntry.update({
          where: {
            id: material.id,
          },
          data: {
            vatRate:
              typeof input.suggestedVatRate === "number"
                ? new Prisma.Decimal(input.suggestedVatRate)
                : material.vatRate,
          },
        });
      }

      const journalEntry = await createJournalEntryFromMaterialInDb(material.id, tx);

      const updatedSuggestion = await tx.accountingSuggestion.update({
        where: {
          id: suggestion.id,
        },
        data: {
          status: "ACCEPTED",
          reviewedByUserId: reviewerId,
          reviewedAt: new Date(),
          reasoning: input.reasoning || suggestion.reasoning,
        },
      });

      return { suggestion: updatedSuggestion, journalEntry };
    }

    if (suggestion.sourceType === "PAYROLL") {
      const journalEntry = await createJournalEntryFromPayrollRunInDb(suggestion.sourceId, tx);

      const updatedSuggestion = await tx.accountingSuggestion.update({
        where: {
          id: suggestion.id,
        },
        data: {
          status: "ACCEPTED",
          reviewedByUserId: reviewerId,
          reviewedAt: new Date(),
          reasoning: input.reasoning || suggestion.reasoning,
        },
      });

      return { suggestion: updatedSuggestion, journalEntry };
    }

    throw new Error("This suggestion type cannot be posted yet.");
  });
}
