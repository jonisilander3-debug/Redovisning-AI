import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import { getGroupContextByCompanyId } from "@/lib/group-admin";
import { prisma } from "@/lib/prisma";

export async function POST(
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
      { message: "Only owners and admins can complete company setup." },
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
    userId?: string;
    role?: string;
    makePrimary?: boolean;
  };

  const userId = String(json.userId ?? "");
  const role = String(json.role ?? "");
  const makePrimary = Boolean(json.makePrimary);

  if (!userId || !role) {
    return NextResponse.json(
      { message: "Choose a person and role first." },
      { status: 400 },
    );
  }

  const [targetCompany, targetUser, existingAccess] = await Promise.all([
    prisma.company.findFirst({
      where: {
        id: targetCompanyId,
        groupId: groupContext.group.id,
      },
      select: {
        id: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        id: userId,
        companyMemberships: {
          some: {
            company: {
              groupId: groupContext.group.id,
            },
          },
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.companyMembership.findFirst({
      where: {
        companyId: targetCompanyId,
        userId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!targetCompany || !targetUser) {
    return NextResponse.json(
      { message: "That person or company is not available in this group." },
      { status: 404 },
    );
  }

  if (existingAccess) {
    await prisma.companyMembership.update({
      where: {
        id: existingAccess.id,
      },
      data: {
        role: role as "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE",
      },
    });
  } else {
    await prisma.companyMembership.create({
      data: {
        companyId: targetCompanyId,
        userId,
        role: role as "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE",
      },
    });
  }

  if (makePrimary) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        companyId: targetCompanyId,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
