import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { updateTemplateSchema } from "@/lib/templates";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; templateId: string }>;
  },
) {
  const { companySlug, templateId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can update templates." },
      { status: 403 },
    );
  }

  const template = await prisma.workTemplate.findFirst({
    where: {
      id: templateId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
      templateType: true,
    },
  });

  if (!template) {
    return NextResponse.json(
      { message: "That template could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();
  const result = updateTemplateSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the template details first." },
      { status: 400 },
    );
  }

  await prisma.workTemplate.update({
    where: {
      id: templateId,
    },
    data: {
      title: result.data.title,
      description: result.data.description || null,
      status: result.data.status,
      defaultProjectTitle:
        template.templateType === "PROJECT_TEMPLATE"
          ? result.data.defaultProjectTitle || null
          : null,
      defaultProjectDescription:
        template.templateType === "PROJECT_TEMPLATE"
          ? result.data.defaultProjectDescription || null
          : null,
      defaultTaskTitle:
        template.templateType === "TASK_TEMPLATE"
          ? result.data.defaultTaskTitle || null
          : null,
      defaultTaskDescription:
        template.templateType === "TASK_TEMPLATE"
          ? result.data.defaultTaskDescription || null
          : null,
    },
  });

  return NextResponse.json({ ok: true });
}
