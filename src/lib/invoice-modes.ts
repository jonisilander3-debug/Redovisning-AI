import { InvoiceMode } from "@prisma/client";

export const invoiceModeLabels: Record<InvoiceMode, string> = {
  PROJECT_FINAL: "Slutfaktura",
  PERIODIC: "Periodfakturering",
  MANUAL_PROGRESS: "Delfakturering",
};

export const invoiceModeOptions = Object.entries(invoiceModeLabels).map(([value, label]) => ({
  value,
  label,
}));
