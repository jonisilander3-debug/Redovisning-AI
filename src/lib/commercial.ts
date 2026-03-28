import { Prisma, ProjectCommercialBasisType } from "@prisma/client";

const ZERO = new Prisma.Decimal(0);

function decimal(value: Prisma.Decimal | number | string | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  if (value === null || typeof value === "undefined") {
    return ZERO;
  }
  return new Prisma.Decimal(value);
}

export const commercialBasisLabels: Record<ProjectCommercialBasisType, string> = {
  QUOTE: "Offert",
  MANUAL: "Manuell budget",
  RUNNING_WORK: "Löpande arbete",
};

export function getCommercialVarianceLabel(value: Prisma.Decimal) {
  if (value.greaterThan(0)) {
    return "Under budget";
  }
  if (value.lessThan(0)) {
    return "Över budget";
  }
  return "I linje";
}

export function getCommercialVarianceTone(value: Prisma.Decimal) {
  if (value.greaterThan(0)) {
    return "success" as const;
  }
  if (value.lessThan(0)) {
    return "danger" as const;
  }
  return "accent" as const;
}

export function getProjectCommercialSummary(project: {
  commercialBasisType: ProjectCommercialBasisType;
  budgetNet?: Prisma.Decimal | string | null;
  budgetGross?: Prisma.Decimal | string | null;
  budgetLaborValue?: Prisma.Decimal | string | null;
  budgetMaterialValue?: Prisma.Decimal | string | null;
  quote?: {
    totalNet: Prisma.Decimal | string;
    totalGross: Prisma.Decimal | string;
    quoteNumber: string;
    status: string;
  } | null;
  billingSummary?: {
    totalBilledAmount: Prisma.Decimal | string;
    totalPaidAmount: Prisma.Decimal | string;
    remainingBillableAmount: Prisma.Decimal | string;
    outstandingReceivables: Prisma.Decimal | string;
  } | null;
}) {
  const agreedNet = project.quote ? decimal(project.quote.totalNet) : decimal(project.budgetNet);
  const agreedGross = project.quote ? decimal(project.quote.totalGross) : decimal(project.budgetGross);
  const billed = decimal(project.billingSummary?.totalBilledAmount);
  const paid = decimal(project.billingSummary?.totalPaidAmount);
  const unbilled = decimal(project.billingSummary?.remainingBillableAmount);
  const outstanding = decimal(project.billingSummary?.outstandingReceivables);
  const derivedProjectValue = billed.add(unbilled);
  const remainingCommercialRoom = agreedGross.sub(billed.add(unbilled));

  return {
    agreedNet,
    agreedGross,
    billed,
    paid,
    unbilled,
    outstanding,
    derivedProjectValue,
    remainingCommercialRoom,
    varianceLabel: getCommercialVarianceLabel(remainingCommercialRoom),
    varianceTone: getCommercialVarianceTone(remainingCommercialRoom),
    laborBudget: decimal(project.budgetLaborValue),
    materialBudget: decimal(project.budgetMaterialValue),
    basisLabel: commercialBasisLabels[project.commercialBasisType],
  };
}
