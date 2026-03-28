import { LegalForm } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const legalFormLabels: Record<LegalForm, string> = {
  SOLE_PROPRIETORSHIP: "Enskild firma",
  TRADING_PARTNERSHIP: "Handelsbolag",
  LIMITED_PARTNERSHIP: "Kommanditbolag",
  LIMITED_COMPANY: "Aktiebolag",
};

export const legalFormOptions = Object.entries(legalFormLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const onboardingSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  companyName: z.string().min(2).max(120),
  organizationNumber: z.string().min(6).max(30),
  legalForm: z.nativeEnum(LegalForm),
});

export function getLegalFormLabel(form: LegalForm) {
  return legalFormLabels[form];
}

export function supportsCorporateStructure(form: LegalForm) {
  return form !== "SOLE_PROPRIETORSHIP";
}

export function slugifyCompanyName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function buildUniqueCompanySlug(companyName: string) {
  const baseSlug = slugifyCompanyName(companyName) || "company";
  let candidate = baseSlug;
  let counter = 1;

  while (
    await prisma.company.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}
