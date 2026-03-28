import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { updateEmployerDeclarationStatusSchema } from "@/lib/employer-declarations";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; declarationRunId: string }>;
  },
) {
  const { companySlug, declarationRunId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can update employer declarations." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = updateEmployerDeclarationStatusSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a valid declaration status." },
      { status: 400 },
    );
  }

  const declaration = await prisma.employerDeclarationRun.findFirst({
    where: {
      id: declarationRunId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!declaration) {
    return NextResponse.json({ message: "That declaration run could not be found." }, { status: 404 });
  }

  const updated = await prisma.employerDeclarationRun.update({
    where: {
      id: declaration.id,
    },
    data: {
      status: result.data.status,
      submissionReference:
        result.data.status === "SUBMITTED"
          ? `AGI-${new Date().toISOString().slice(0, 10)}-${declaration.id.slice(-6).toUpperCase()}`
          : null,
      submittedAt: result.data.status === "SUBMITTED" ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true, declarationRunId: updated.id });
}
