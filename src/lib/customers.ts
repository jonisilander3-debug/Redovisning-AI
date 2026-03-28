import { Prisma } from "@prisma/client";
import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  organizationNumber: z.string().trim().max(32).optional().transform((value) => value || ""),
  contactPerson: z.string().trim().max(120).optional().transform((value) => value || ""),
  email: z.string().trim().email().optional().or(z.literal("")).transform((value) => value || ""),
  phone: z.string().trim().max(40).optional().transform((value) => value || ""),
  addressLine1: z.string().trim().max(160).optional().transform((value) => value || ""),
  postalCode: z.string().trim().max(20).optional().transform((value) => value || ""),
  city: z.string().trim().max(80).optional().transform((value) => value || ""),
  invoiceTermsDays: z.coerce.number().int().min(0).max(365).optional(),
  defaultHourlyRate: z.coerce.number().min(0).optional(),
});

export function formatCustomerAddress(customer: {
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
}) {
  return [customer.addressLine1, [customer.postalCode, customer.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

export function decimalOrNull(value?: number | null) {
  return typeof value === "number" ? new Prisma.Decimal(value) : null;
}
