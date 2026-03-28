import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createAbsenceEntrySchema,
  parseAbsenceDate,
} from "@/lib/absence";
import { prisma } from "@/lib/prisma";

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
      { message: "Only company managers can create absence entries." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createAbsenceEntrySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the absence details first." },
      { status: 400 },
    );
  }

  const startDate = parseAbsenceDate(result.data.startDate);
  const endDate = parseAbsenceDate(result.data.endDate);

  if (!startDate || !endDate) {
    return NextResponse.json(
      { message: "Choose valid start and end dates." },
      { status: 400 },
    );
  }

  const entry = await prisma.absenceEntry.create({
    data: {
      companyId: viewer.company.id,
      userId: result.data.userId,
      type: result.data.type,
      startDate,
      endDate,
      quantityDays:
        typeof result.data.quantityDays === "number" ? result.data.quantityDays : null,
      quantityHours:
        typeof result.data.quantityHours === "number" ? result.data.quantityHours : null,
      note: result.data.note || null,
      status: result.data.status,
    },
    select: {
      id: true,
    },
  });

  return NextResponse.json({ ok: true, absenceEntryId: entry.id });
}
