import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

export async function generateInvoiceNumber(
  companyId: string,
  db: PrismaClientLike = prisma,
  issueDate = new Date(),
) {
  const year = issueDate.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const latestInvoice = await db.invoice.findFirst({
    where: {
      companyId,
      issueDate: {
        gte: yearStart,
        lt: yearEnd,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  const previousSequence = latestInvoice?.invoiceNumber
    ? Number(latestInvoice.invoiceNumber.split("-")[1] ?? "0")
    : 0;
  const nextSequence = previousSequence + 1;

  return `${year}-${nextSequence.toString().padStart(4, "0")}`;
}
