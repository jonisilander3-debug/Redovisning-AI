import { Prisma } from "@prisma/client";
import { CustomersPage } from "@/components/customers/customers-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);

export default async function CustomersWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const customers = await prisma.customer.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      projects: {
        select: { id: true },
      },
      invoices: {
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          dueDate: true,
          status: true,
          totalGross: true,
          paidAmount: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const now = new Date();

  return (
    <CustomersPage
      companySlug={companySlug}
      customers={customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        organizationNumber: customer.organizationNumber,
        contactPerson: customer.contactPerson,
        email: customer.email,
        phone: customer.phone,
        addressLine1: customer.addressLine1,
        postalCode: customer.postalCode,
        city: customer.city,
        invoiceTermsDays: customer.invoiceTermsDays,
        defaultHourlyRate: customer.defaultHourlyRate?.toString() ?? null,
        outstandingAmount: customer.invoices
          .reduce((sum, invoice) => sum.add(invoice.totalGross.sub(invoice.paidAmount)), ZERO)
          .toString(),
        overdueInvoiceCount: customer.invoices.filter(
          (invoice) =>
            (invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID") &&
            invoice.dueDate < now &&
            invoice.totalGross.sub(invoice.paidAmount).greaterThan(0),
        ).length,
        projectCount: customer.projects.length,
      }))}
    />
  );
}
