import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  importCustomerPaymentsFromCsv,
  importCustomerPaymentsSchema,
} from "@/lib/customer-payments";

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
      { message: "Only company managers can import customer payments." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = importCustomerPaymentsSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json({ message: "Paste a valid CSV file first." }, { status: 400 });
  }

  try {
    const createdIds = await importCustomerPaymentsFromCsv({
      companyId: viewer.company.id,
      csv: result.data.csv,
    });

    return NextResponse.json({ ok: true, importedCount: createdIds.length });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "We could not import those payments.",
      },
      { status: 400 },
    );
  }
}
