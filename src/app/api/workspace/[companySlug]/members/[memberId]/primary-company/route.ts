import { NextResponse } from "next/server";
import { canManageMembers, getCurrentWorkspaceViewer } from "@/lib/access";
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

  if (!canManageMembers(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can change the primary company." },
      { status: 403 },
    );
  }

  const json = (await request.json()) as { companyId?: string };
  const companyId = String(json.companyId ?? "");

  if (!companyId) {
    return NextResponse.json(
      { message: "Choose a primary company first." },
      { status: 400 },
    );
  }

  const membership = await prisma.companyMembership.findFirst({
    where: {
      userId: memberId,
      companyId,
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    return NextResponse.json(
      { message: "That user does not have access to the selected company." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: {
      id: memberId,
    },
    data: {
      companyId,
    },
  });

  return NextResponse.json({ ok: true });
}
