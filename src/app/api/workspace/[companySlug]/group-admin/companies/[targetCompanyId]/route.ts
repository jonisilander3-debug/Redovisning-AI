import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  getGroupContextByCompanyId,
  updateGroupCompanySchema,
} from "@/lib/group-admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; targetCompanyId: string }>;
  },
) {
  const { companySlug, targetCompanyId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageGroupAdmin(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can manage a company group." },
      { status: 403 },
    );
  }

  const groupContext = await getGroupContextByCompanyId(viewer.company.id);

  if (!groupContext?.group) {
    return NextResponse.json(
      { message: "This workspace is not connected to a company group yet." },
      { status: 400 },
    );
  }

  const json = await request.json();
  const result = updateGroupCompanySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the group company details." },
      { status: 400 },
    );
  }

  const targetCompany = await prisma.company.findFirst({
    where: {
      id: targetCompanyId,
      groupId: groupContext.group.id,
    },
    select: {
      id: true,
    },
  });

  if (!targetCompany) {
    return NextResponse.json(
      { message: "That company is not part of this group." },
      { status: 404 },
    );
  }

  if (result.data.parentCompanyId === targetCompanyId) {
    return NextResponse.json(
      { message: "A company cannot sit under itself." },
      { status: 400 },
    );
  }

  if (result.data.parentCompanyId) {
    const parentCompany = await prisma.company.findFirst({
      where: {
        id: result.data.parentCompanyId,
        groupId: groupContext.group.id,
      },
      select: {
        id: true,
      },
    });

    if (!parentCompany) {
      return NextResponse.json(
        { message: "Choose a parent company inside the same group." },
        { status: 400 },
      );
    }
  }

  await prisma.company.update({
    where: {
      id: targetCompanyId,
    },
    data: {
      companyType: result.data.companyType,
      parentCompanyId: result.data.parentCompanyId || null,
      isHoldingCompany:
        result.data.companyType === "HOLDING" ? true : result.data.isHoldingCompany,
    },
  });

  return NextResponse.json({ ok: true });
}
