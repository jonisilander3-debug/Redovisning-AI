import { NextResponse } from "next/server";
import { createJournalEntryFromInvoiceInDb } from "@/lib/accounting";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { updateInvoiceStatusSchema } from "@/lib/invoicing";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; invoiceId: string }>;
  },
) {
  const { companySlug, invoiceId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can view invoices." },
      { status: 403 },
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId: viewer.company.id,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          customerName: true,
        },
      },
      customerPayments: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
      lines: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ message: "That invoice could not be found." }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; invoiceId: string }>;
  },
) {
  const { companySlug, invoiceId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can update invoice status." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = updateInvoiceStatusSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a valid invoice status." },
      { status: 400 },
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
      status: true,
      lines: {
        select: {
          sourceTimeEntryId: true,
          sourceMaterialId: true,
        },
      },
      paidAmount: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ message: "That invoice could not be found." }, { status: 404 });
  }

  if (invoice.status === "CANCELLED" && result.data.status !== "CANCELLED") {
    return NextResponse.json(
      { message: "Cancelled invoices cannot be reopened." },
      { status: 400 },
    );
  }

  if (
    result.data.status === "CANCELLED" &&
    (invoice.status === "SENT" ||
      invoice.status === "PARTIALLY_PAID" ||
      invoice.status === "PAID")
  ) {
    return NextResponse.json(
      {
        message:
          "Sent or paid invoices cannot be cancelled here once accounting has started. Create a correcting flow later instead.",
      },
      { status: 400 },
    );
  }

  const allowedTransitions: Record<typeof invoice.status, Array<typeof result.data.status>> = {
    DRAFT: ["DRAFT", "SENT", "CANCELLED"],
    SENT: ["SENT"],
    PARTIALLY_PAID: ["PARTIALLY_PAID"],
    PAID: ["PAID"],
    CANCELLED: ["CANCELLED"],
  };

  if (!allowedTransitions[invoice.status].includes(result.data.status)) {
    return NextResponse.json(
      { message: "That invoice status change is not allowed." },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (result.data.status === "CANCELLED" && invoice.status !== "CANCELLED") {
      const timeEntryIds = invoice.lines
        .map((line) => line.sourceTimeEntryId)
        .filter((value): value is string => Boolean(value));
      const materialEntryIds = invoice.lines
        .map((line) => line.sourceMaterialId)
        .filter((value): value is string => Boolean(value));

      if (timeEntryIds.length > 0) {
        await tx.timeEntry.updateMany({
          where: {
            id: {
              in: timeEntryIds,
            },
          },
          data: {
            invoiced: false,
          },
        });
      }

      if (materialEntryIds.length > 0) {
        await tx.materialEntry.updateMany({
          where: {
            id: {
              in: materialEntryIds,
            },
          },
          data: {
            invoiced: false,
          },
        });
      }
    }

    const nextInvoice = await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: result.data.status,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (result.data.status === "SENT" && invoice.status !== "SENT") {
      await createJournalEntryFromInvoiceInDb(invoice.id, tx);
    }

    return nextInvoice;
  });

  return NextResponse.json({ ok: true, invoice: updated });
}
