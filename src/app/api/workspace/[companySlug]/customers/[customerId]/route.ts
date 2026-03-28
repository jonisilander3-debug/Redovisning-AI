import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { customerSchema, decimalOrNull } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companySlug: string; customerId: string }> },
) {
  const { companySlug, customerId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json({ message: "Only company managers can manage customers." }, { status: 403 });
  }

  const result = customerSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ message: "Please complete the customer details." }, { status: 400 });
  }

  await prisma.customer.updateMany({
    where: {
      id: customerId,
      companyId: viewer.company.id,
    },
    data: {
      name: result.data.name,
      organizationNumber: result.data.organizationNumber || null,
      contactPerson: result.data.contactPerson || null,
      email: result.data.email || null,
      phone: result.data.phone || null,
      addressLine1: result.data.addressLine1 || null,
      postalCode: result.data.postalCode || null,
      city: result.data.city || null,
      invoiceTermsDays: typeof result.data.invoiceTermsDays === "number" ? result.data.invoiceTermsDays : null,
      defaultHourlyRate: decimalOrNull(result.data.defaultHourlyRate),
    },
  });

  return NextResponse.json({ ok: true });
}
