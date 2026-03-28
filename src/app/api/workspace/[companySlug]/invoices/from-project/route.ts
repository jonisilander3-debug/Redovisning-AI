import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createInvoiceFromProject,
  createInvoiceFromProjectSchema,
  parseOptionalDate,
} from "@/lib/invoicing";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can create invoices." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createInvoiceFromProjectSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a project before creating an invoice." },
      { status: 400 },
    );
  }

  try {
    const invoice = await createInvoiceFromProject(result.data.projectId, {
      companyId: viewer.company.id,
      vatRate: result.data.vatRate,
      defaultHourlyRate: result.data.defaultHourlyRate,
      issueDate: parseOptionalDate(result.data.issueDate) ?? undefined,
      dueDate: parseOptionalDate(result.data.dueDate) ?? undefined,
    });

    return NextResponse.json({ ok: true, invoiceId: invoice.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not create that invoice right now.",
      },
      { status: 400 },
    );
  }
}
