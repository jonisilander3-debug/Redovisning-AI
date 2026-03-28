import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer } from "@/lib/access";
import { createMemberSchema, createMemberAccess } from "@/lib/member-management";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (viewer.role !== "OWNER" && viewer.role !== "ADMIN") {
    return NextResponse.json(
      { message: "Only company owners and admins can add members." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createMemberSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the new member details." },
      { status: 400 },
    );
  }

  const email = result.data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      companyMemberships: {
        where: {
          companyId: viewer.company.id,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (existingUser) {
    if (existingUser.companyMemberships.length > 0) {
      return NextResponse.json(
        { message: "That email already has access to this company." },
        { status: 409 },
      );
    }

    await prisma.companyMembership.create({
      data: {
        userId: existingUser.id,
        companyId: viewer.company.id,
        role: result.data.role,
      },
    });

    return NextResponse.json({
      ok: true,
      id: existingUser.id,
      email: existingUser.email,
      reusedExistingAccount: true,
    });
  }

  const { user, temporaryPassword } = await createMemberAccess({
    companyId: viewer.company.id,
    name: result.data.name,
    email,
    role: result.data.role,
  });

  return NextResponse.json({
    ok: true,
    id: user.id,
    email: user.email,
    temporaryPassword,
  });
}
