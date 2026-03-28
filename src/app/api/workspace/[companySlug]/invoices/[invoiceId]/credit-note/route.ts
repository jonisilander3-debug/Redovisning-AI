import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createCreditNoteFromInvoice,
  createCreditNoteSchema,
  parseOptionalDate,
} from "@/lib/invoicing";

export async function POST(
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
      { message: "Only company managers can create credit notes." },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => ({}));
  const result = createCreditNoteSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose valid credit-note dates first." },
      { status: 400 },
    );
  }

  try {
    const creditNote = await createCreditNoteFromInvoice(invoiceId, {
      companyId: viewer.company.id,
      issueDate: parseOptionalDate(result.data.issueDate) ?? new Date(),
      dueDate: parseOptionalDate(result.data.dueDate) ?? new Date(),
    });

    return NextResponse.json({ ok: true, invoiceId: creditNote.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "We could not create that credit note.",
      },
      { status: 400 },
    );
  }
}
