import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { createJobTypePresetSchema } from "@/lib/job-type-presets";
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
      { message: "Only company managers can create job presets." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createJobTypePresetSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the preset details first." },
      { status: 400 },
    );
  }

  if (result.data.linkedProjectTemplateId) {
    const template = await prisma.workTemplate.findFirst({
      where: {
        id: result.data.linkedProjectTemplateId,
        companyId: viewer.company.id,
        templateType: "PROJECT_TEMPLATE",
      },
      select: {
        id: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { message: "That linked project template could not be found." },
        { status: 404 },
      );
    }
  }

  await prisma.jobTypePreset.create({
    data: {
      companyId: viewer.company.id,
      title: result.data.title,
      description: result.data.description || null,
      launchLabel: result.data.launchLabel || null,
      launchDescription: result.data.launchDescription || null,
      status: result.data.status,
      linkedProjectTemplateId: result.data.linkedProjectTemplateId || null,
    },
  });

  return NextResponse.json({ ok: true });
}
