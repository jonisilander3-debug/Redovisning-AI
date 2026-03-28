import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import { getGroupContextByCompanyId } from "@/lib/group-admin";
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
      { message: "Only owners and admins can manage starter setup." },
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

  const json = (await request.json()) as {
    workspaceManagerId?: string;
    starterSetupNote?: string;
  };

  const workspaceManagerId = String(json.workspaceManagerId ?? "");
  const starterSetupNote = String(json.starterSetupNote ?? "").trim();

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

  if (workspaceManagerId) {
    const membership = await prisma.companyMembership.findFirst({
      where: {
        companyId: targetCompanyId,
        userId: workspaceManagerId,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "The workspace manager must already be part of the company." },
        { status: 400 },
      );
    }
  }

  await prisma.company.update({
    where: {
      id: targetCompanyId,
    },
    data: {
      workspaceManagerId: workspaceManagerId || null,
      starterSetupNote: starterSetupNote || null,
    },
  });

  return NextResponse.json({ ok: true });
}
