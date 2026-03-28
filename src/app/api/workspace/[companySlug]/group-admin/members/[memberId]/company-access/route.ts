import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  getGroupContextByCompanyId,
  upsertGroupMembershipSchema,
} from "@/lib/group-admin";
import { prisma } from "@/lib/prisma";

export async function POST(
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
  const result = upsertGroupMembershipSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a company and role first." },
      { status: 400 },
    );
  }

  const [targetUser, targetCompany, existingAccess] = await Promise.all([
    prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true },
    }),
    prisma.company.findFirst({
      where: {
        id: result.data.companyId,
        groupId: groupContext.group.id,
      },
      select: { id: true },
    }),
    prisma.companyMembership.findFirst({
      where: {
        userId: memberId,
        companyId: result.data.companyId,
      },
      select: { id: true },
    }),
  ]);

  if (!targetUser || !targetCompany) {
    return NextResponse.json(
      { message: "That member or company could not be found in this group." },
      { status: 404 },
    );
  }

  if (existingAccess) {
    return NextResponse.json(
      { message: "That person already has access to this company." },
      { status: 409 },
    );
  }

  await prisma.companyMembership.create({
    data: {
      userId: memberId,
      companyId: result.data.companyId,
      role: result.data.role,
    },
  });

  return NextResponse.json({ ok: true });
}
