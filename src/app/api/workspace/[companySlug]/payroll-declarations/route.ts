import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createEmployerDeclarationRun,
  createEmployerDeclarationRunSchema,
} from "@/lib/employer-declarations";

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
      { message: "Only company managers can create employer declarations." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createEmployerDeclarationRunSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a valid declaration period first." },
      { status: 400 },
    );
  }

  const periodStart = new Date(result.data.periodStart);
  const periodEnd = new Date(result.data.periodEnd);

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return NextResponse.json(
      { message: "Choose a valid declaration period." },
      { status: 400 },
    );
  }

  try {
    const declaration = await createEmployerDeclarationRun(
      viewer.company.id,
      periodStart,
      periodEnd,
    );
    return NextResponse.json({ ok: true, declarationRunId: declaration.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not create that declaration run.",
      },
      { status: 400 },
    );
  }
}
