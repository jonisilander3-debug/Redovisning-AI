import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createExecutionImprovementSchema,
} from "@/lib/execution-improvements";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string }>;
  },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can create execution improvements." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createExecutionImprovementSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the improvement details first." },
      { status: 400 },
    );
  }

  const sourcePreventiveAction = result.data.sourcePreventiveActionId
    ? await prisma.preventiveAction.findFirst({
        where: {
          id: result.data.sourcePreventiveActionId,
          companyId: viewer.company.id,
        },
        select: {
          id: true,
          projectId: true,
          relatedTaskId: true,
        },
      })
    : null;

  if (result.data.sourcePreventiveActionId && !sourcePreventiveAction) {
    return NextResponse.json(
      { message: "That preventive action could not be found." },
      { status: 404 },
    );
  }

  const projectId = result.data.projectId || sourcePreventiveAction?.projectId || null;
  const relatedTaskId = result.data.relatedTaskId || sourcePreventiveAction?.relatedTaskId || null;

  await prisma.executionImprovement.create({
    data: {
      companyId: viewer.company.id,
      projectId,
      relatedTaskId,
      sourcePreventiveActionId: result.data.sourcePreventiveActionId || null,
      title: result.data.title,
      description: result.data.description,
      targetType: result.data.targetType,
      status: result.data.status,
      appliesToFutureTasks: result.data.appliesToFutureTasks,
    },
  });

  return NextResponse.json({ ok: true });
}
