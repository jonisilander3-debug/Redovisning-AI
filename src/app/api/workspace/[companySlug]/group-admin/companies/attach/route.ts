import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  attachCompanyToGroupSchema,
  getGroupContextByCompanyId,
} from "@/lib/group-admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string }>;
  },
) {
  const { companySlug } = await params;
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
  const result = attachCompanyToGroupSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a company and how it should sit in the group." },
      { status: 400 },
    );
  }

  const targetCompany = await prisma.company.findUnique({
    where: {
      id: result.data.companyId,
    },
    select: {
      id: true,
      groupId: true,
    },
  });

  if (!targetCompany) {
    return NextResponse.json({ message: "That company could not be found." }, { status: 404 });
  }

  if (targetCompany.groupId && targetCompany.groupId !== groupContext.group.id) {
    return NextResponse.json(
      { message: "That company already belongs to a different group." },
      { status: 400 },
    );
  }

  await prisma.company.update({
    where: {
      id: targetCompany.id,
    },
    data: {
      groupId: groupContext.group.id,
      companyType: result.data.companyType,
      isHoldingCompany: result.data.companyType === "HOLDING",
    },
  });

  return NextResponse.json({ ok: true });
}
