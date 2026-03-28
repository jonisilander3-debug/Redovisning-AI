import { BankFileExportProfile, CompanyType, LegalForm } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugifyCompanyName } from "@/lib/company";
import { bankFileExportProfileLabels } from "@/lib/skv-exports";

export const companyTypeLabels: Record<CompanyType, string> = {
  OPERATING: "Operating company",
  HOLDING: "Holding company",
  SUBSIDIARY: "Subsidiary",
  PROPERTY: "Property company",
  OTHER: "Other",
};

export const companyTypeOptions = Object.entries(companyTypeLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const legalFormLabels: Record<LegalForm, string> = {
  SOLE_PROPRIETORSHIP: "Enskild firma",
  TRADING_PARTNERSHIP: "Handelsbolag",
  LIMITED_PARTNERSHIP: "Kommanditbolag",
  LIMITED_COMPANY: "Aktiebolag",
};

export const bankFileExportProfileOptions = Object.entries(bankFileExportProfileLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export function getLegalFormLabel(form: LegalForm) {
  return legalFormLabels[form];
}

export function supportsGroupStructure(form: LegalForm) {
  return form !== "SOLE_PROPRIETORSHIP";
}

export const createBusinessGroupSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const updateCompanyStructureSchema = z.object({
  groupId: z.string().optional().transform((value) => value || ""),
  parentCompanyId: z.string().optional().transform((value) => value || ""),
  bankIban: z.string().trim().max(40).optional().transform((value) => value || ""),
  bankBic: z.string().trim().max(20).optional().transform((value) => value || ""),
  bankExportProfile: z.nativeEnum(BankFileExportProfile).default("PAIN_001"),
  legalForm: z.nativeEnum(LegalForm),
  companyType: z.nativeEnum(CompanyType),
  isHoldingCompany: z.coerce.boolean().optional().default(false),
});

export function getCompanyTypeLabel(type: CompanyType) {
  return companyTypeLabels[type];
}

export function getCompanyTypeTone(type: CompanyType) {
  if (type === "HOLDING") {
    return "primary" as const;
  }

  if (type === "SUBSIDIARY") {
    return "accent" as const;
  }

  if (type === "PROPERTY") {
    return "success" as const;
  }

  return "default" as const;
}

export async function buildUniqueGroupSlug(name: string) {
  const baseSlug = slugifyCompanyName(name) || "group";
  let candidate = baseSlug;
  let counter = 1;

  while (
    await prisma.businessGroup.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}
