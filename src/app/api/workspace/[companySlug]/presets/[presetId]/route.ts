import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { updateJobTypePresetSchema } from "@/lib/job-type-presets";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; presetId: string }>;
  },
) {
  const { companySlug, presetId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can update job presets." },
      { status: 403 },
    );
  }

  const preset = await prisma.jobTypePreset.findFirst({
    where: {
      id: presetId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
    },
  });

  if (!preset) {
    return NextResponse.json(
      { message: "That preset could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();
  const result = updateJobTypePresetSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the preset details first." },
      { status: 400 },
    );
  }

  await prisma.jobTypePreset.update({
    where: {
      id: presetId,
    },
    data: {
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
