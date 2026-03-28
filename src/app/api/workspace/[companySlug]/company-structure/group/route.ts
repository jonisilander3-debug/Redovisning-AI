import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer, canManageCompanyStructure } from "@/lib/access";
import {
  buildUniqueGroupSlug,
  createBusinessGroupSchema,
} from "@/lib/company-structure";
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

  if (!canManageCompanyStructure(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can manage company structure." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createBusinessGroupSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please add a group name first." },
      { status: 400 },
    );
  }

  const slug = await buildUniqueGroupSlug(result.data.name);

  const group = await prisma.businessGroup.create({
    data: {
      name: result.data.name,
      slug,
      companies: {
        connect: {
          id: viewer.company.id,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    groupId: group.id,
  });
}
