import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { updateAbsenceEntrySchema } from "@/lib/absence";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; absenceEntryId: string }>;
  },
) {
  const { companySlug, absenceEntryId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can update absence entries." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = updateAbsenceEntrySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a valid absence update." },
      { status: 400 },
    );
  }

  const entry = await prisma.absenceEntry.findFirst({
    where: {
      id: absenceEntryId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
    },
  });

  if (!entry) {
    return NextResponse.json({ message: "That absence entry could not be found." }, { status: 404 });
  }

  await prisma.absenceEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      ...(result.data.status ? { status: result.data.status } : {}),
      ...(typeof result.data.note === "string" ? { note: result.data.note || null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
