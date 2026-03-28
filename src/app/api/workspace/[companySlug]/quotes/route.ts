import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { createQuote, quoteSchema } from "@/lib/quotes";

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
    return NextResponse.json({ message: "Only managers can create quotes." }, { status: 403 });
  }

  const result = quoteSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ message: "Kontrollera offerten och försök igen." }, { status: 400 });
  }

  try {
    const quote = await createQuote(viewer.company.id, result.data);
    return NextResponse.json({ ok: true, quoteId: quote.id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Offerten kunde inte skapas." },
      { status: 400 },
    );
  }
}
