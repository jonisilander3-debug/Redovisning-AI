import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer, canManageMembers } from "@/lib/access";
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

  if (!canManageMembers(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can manage company access." },
      { status: 403 },
    );
  }

  const json = (await request.json()) as {
    companyId?: string;
    role?: string;
  };

  const companyId = String(json.companyId ?? "");
  const role = String(json.role ?? "EMPLOYEE");

  if (!companyId) {
    return NextResponse.json(
      { message: "Choose a company first." },
      { status: 400 },
    );
  }

  const [targetUser, company] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: memberId,
      },
      select: {
        id: true,
      },
    }),
    prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!targetUser || !company) {
    return NextResponse.json(
      { message: "That user or company could not be found." },
      { status: 404 },
    );
  }

  const existingAccess = await prisma.companyMembership.findFirst({
    where: {
      userId: memberId,
      companyId,
    },
    select: {
      id: true,
    },
  });

  if (existingAccess) {
    return NextResponse.json(
      { message: "That user already has access to this company." },
      { status: 409 },
    );
  }

  await prisma.companyMembership.create({
    data: {
      userId: memberId,
      companyId,
      role: role as "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE",
    },
  });

  return NextResponse.json({ ok: true });
}
