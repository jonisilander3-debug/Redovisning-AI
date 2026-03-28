import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  getGroupContextByCompanyId,
  updateGroupPrimaryCompanySchema,
} from "@/lib/group-admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; memberId: string }>;
  },
) {
  const { companySlug, memberId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageGroupAdmin(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can manage group access." },
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
  const result = updateGroupPrimaryCompanySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a primary company first." },
      { status: 400 },
    );
  }

  const membership = await prisma.companyMembership.findFirst({
    where: {
      userId: memberId,
      companyId: result.data.companyId,
      company: {
        groupId: groupContext.group.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    return NextResponse.json(
      { message: "That person does not have access to the selected group company." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: memberId },
    data: {
      companyId: result.data.companyId,
    },
  });

  return NextResponse.json({ ok: true });
}
