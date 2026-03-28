import { BankFileExportProfile, Prisma } from "@prisma/client";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(value: Prisma.Decimal | number | string) {
  const amount = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
}

function compactOrgNumber(value: string) {
  return value.replace(/\D/g, "");
}

export const bankFileExportProfileLabels: Record<BankFileExportProfile, string> = {
  PAIN_001: "ISO 20022 pain.001",
  BANKGIROT_LON: "Bankgirot Lon",
};

export function buildEmployerDeclarationXml(input: {
  organizationNumber: string;
  companyName: string;
  declarationId: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  totalGrossSalary: Prisma.Decimal;
  totalTax: Prisma.Decimal;
  totalEmployerContribution: Prisma.Decimal;
  lines: Array<{
    employeeName: string;
    taxTable: string | null;
    grossSalary: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    employerContribution: Prisma.Decimal;
    benefitsAmount: Prisma.Decimal;
    absenceAdjustmentAmount: Prisma.Decimal;
  }>;
}) {
  const lineXml = input.lines
    .map(
      (line) => `
    <Individuppgift>
      <Namn>${xmlEscape(line.employeeName)}</Namn>
      <Skattetabell>${xmlEscape(line.taxTable ?? "")}</Skattetabell>
      <KontantBruttolon>${formatAmount(line.grossSalary)}</KontantBruttolon>
      <AvdragenSkatt>${formatAmount(line.taxAmount)}</AvdragenSkatt>
      <Arbetsgivaravgift>${formatAmount(line.employerContribution)}</Arbetsgivaravgift>
      <SkattepliktigaFormaner>${formatAmount(line.benefitsAmount)}</SkattepliktigaFormaner>
      <Franvarojustering>${formatAmount(line.absenceAdjustmentAmount)}</Franvarojustering>
    </Individuppgift>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Arbetsgivardeklaration version="1.1">
  <Avsandare>
    <Organisationsnummer>${xmlEscape(compactOrgNumber(input.organizationNumber))}</Organisationsnummer>
    <Namn>${xmlEscape(input.companyName)}</Namn>
  </Avsandare>
  <Deklaration>
    <DeklarationsId>${xmlEscape(input.declarationId)}</DeklarationsId>
    <PeriodStart>${input.periodStart.toISOString().slice(0, 10)}</PeriodStart>
    <PeriodEnd>${input.periodEnd.toISOString().slice(0, 10)}</PeriodEnd>
    <SkapadTid>${xmlEscape(input.createdAt.toISOString())}</SkapadTid>
    <TotalsummaBruttolon>${formatAmount(input.totalGrossSalary)}</TotalsummaBruttolon>
    <TotalsummaSkatt>${formatAmount(input.totalTax)}</TotalsummaSkatt>
    <TotalsummaArbetsgivaravgift>${formatAmount(input.totalEmployerContribution)}</TotalsummaArbetsgivaravgift>${lineXml}
  </Deklaration>
</Arbetsgivardeklaration>`;
}

export function buildInk2SruContent(input: {
  organizationNumber: string;
  year: number;
  lines: Array<{
    code: string;
    amount: Prisma.Decimal;
  }>;
}) {
  const identity = compactOrgNumber(input.organizationNumber);
  const sortedLines = [...input.lines].sort((left, right) => left.code.localeCompare(right.code));

  return [
    "#DATABESKRIVNING_START",
    "#PRODUKT SRU",
    "#FILNAMN BLANKETTER.SRU",
    "#DATABESKRIVNING_SLUT",
    "#BLANKETT INK2R",
    `#IDENTITET ${identity} ${input.year}0101 000000`,
    ...sortedLines.map((line) => `#UPPGIFT ${line.code} ${formatAmount(line.amount)}`),
    "#BLANKETTSLUT",
  ].join("\r\n");
}

export function buildInk2InfoContent(input: {
  companyName: string;
  organizationNumber: string;
  year: number;
}) {
  return [
    "#DATABESKRIVNING_START",
    "#PRODUKT SRU",
    "#FILNAMN INFO.SRU",
    "#DATABESKRIVNING_SLUT",
    `#MEDIELEV ${input.companyName}`,
    `#ORGNR ${compactOrgNumber(input.organizationNumber)}`,
    `#AR ${input.year}`,
  ].join("\r\n");
}

