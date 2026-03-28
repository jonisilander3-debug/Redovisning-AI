import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  getGroupContextByCompanyId,
} from "@/lib/group-admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; memberId: string; accessId: string }>;
  },
) {
  const { companySlug, memberId, accessId } = await params;
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

  const json = (await request.json()) as { role?: string };
  const role = String(json.role ?? "");

  if (!role) {
    return NextResponse.json({ message: "Choose a role first." }, { status: 400 });
  }

  const access = await prisma.companyMembership.findFirst({
    where: {
      id: accessId,
      userId: memberId,
      company: {
        groupId: groupContext.group.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!access) {
    return NextResponse.json(
      { message: "That company access could not be found in this group." },
      { status: 404 },
    );
  }

  await prisma.companyMembership.update({
    where: { id: accessId },
    data: {
      role: role as "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE",
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; memberId: string; accessId: string }>;
  },
) {
  const { companySlug, memberId, accessId } = await params;
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

  const access = await prisma.companyMembership.findFirst({
    where: {
      id: accessId,
      userId: memberId,
      company: {
        groupId: groupContext.group.id,
      },
    },
    select: {
      id: true,
      companyId: true,
    },
  });

  if (!access) {
    return NextResponse.json(
      { message: "That company access could not be found in this group." },
      { status: 404 },
    );
  }

  await prisma.companyMembership.delete({
    where: { id: accessId },
  });

  return NextResponse.json({ ok: true });
}
