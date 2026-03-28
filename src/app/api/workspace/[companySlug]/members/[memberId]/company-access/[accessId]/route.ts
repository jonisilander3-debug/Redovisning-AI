import { NextResponse } from "next/server";
import { canManageMembers, getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; memberId: string; accessId: string }>;
  },
) {
  const { companySlug, accessId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageMembers(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can manage company access." },
      { status: 403 },
    );
  }

  const json = (await request.json()) as { role?: string };
  const role = String(json.role ?? "");

  if (!role) {
    return NextResponse.json(
      { message: "Choose a role first." },
      { status: 400 },
    );
  }

  await prisma.companyMembership.update({
    where: {
      id: accessId,
    },
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

  if (!canManageMembers(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can manage company access." },
      { status: 403 },
    );
  }

  const access = await prisma.companyMembership.findUnique({
    where: {
      id: accessId,
    },
    select: {
      id: true,
      userId: true,
      companyId: true,
    },
  });

  if (!access || access.userId !== memberId) {
    return NextResponse.json(
      { message: "That company access could not be found." },
      { status: 404 },
    );
  }

  await prisma.companyMembership.delete({
    where: {
      id: accessId,
    },
  });

  return NextResponse.json({ ok: true });
}
