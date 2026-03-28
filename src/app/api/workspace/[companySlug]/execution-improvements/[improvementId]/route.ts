import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { updateExecutionImprovementSchema } from "@/lib/execution-improvements";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; improvementId: string }>;
  },
) {
  const { companySlug, improvementId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can update execution improvements." },
      { status: 403 },
    );
  }

  const improvement = await prisma.executionImprovement.findFirst({
    where: {
      id: improvementId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
    },
  });

  if (!improvement) {
    return NextResponse.json(
      { message: "That improvement could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();
  const result = updateExecutionImprovementSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please choose a valid improvement update." },
      { status: 400 },
    );
  }

  await prisma.executionImprovement.update({
    where: {
      id: improvementId,
    },
    data: {
      title: result.data.title,
      description: result.data.description,
      targetType: result.data.targetType,
      status: result.data.status,
      appliesToFutureTasks: result.data.appliesToFutureTasks,
    },
  });

  return NextResponse.json({ ok: true });
}
