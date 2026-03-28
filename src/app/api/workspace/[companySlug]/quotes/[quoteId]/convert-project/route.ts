import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { convertAcceptedQuoteToProject } from "@/lib/quotes";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ companySlug: string; quoteId: string }> },
) {
  const { companySlug, quoteId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }
  if (!canManageProjects(viewer.role)) {
    return NextResponse.json({ message: "Only managers can convert quotes." }, { status: 403 });
  }

  try {
    const project = await convertAcceptedQuoteToProject({
      quoteId,
      companyId: viewer.company.id,
    });
    return NextResponse.json({ ok: true, projectId: project.id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Offerten kunde inte omvandlas." },
      { status: 400 },
    );
  }
}
