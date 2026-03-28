import { NextResponse } from "next/server";
import { canManageCompanyStructure, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  supportsGroupStructure,
  updateCompanyStructureSchema,
} from "@/lib/company-structure";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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

  if (!canManageCompanyStructure(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can manage company structure." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = updateCompanyStructureSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the company structure details." },
      { status: 400 },
    );
  }

  const company = await prisma.company.findFirst({
    where: {
      id: viewer.company.id,
    },
    select: {
      id: true,
      groupId: true,
    },
  });

  if (!company) {
    return NextResponse.json(
      { message: "That company could not be found." },
      { status: 404 },
    );
  }

  if (result.data.groupId) {
    const group = await prisma.businessGroup.findUnique({
      where: {
        id: result.data.groupId,
      },
      select: {
        id: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { message: "That group could not be found." },
        { status: 400 },
      );
    }
  }

  if (!supportsGroupStructure(result.data.legalForm)) {
    await prisma.company.update({
      where: {
        id: viewer.company.id,
      },
      data: {
        legalForm: result.data.legalForm,
        groupId: null,
        parentCompanyId: null,
        bankIban: result.data.bankIban || null,
        bankBic: result.data.bankBic || null,
        bankExportProfile: result.data.bankExportProfile,
        companyType: "OPERATING",
        isHoldingCompany: false,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (result.data.parentCompanyId) {
    if (result.data.parentCompanyId === viewer.company.id) {
      return NextResponse.json(
        { message: "A company cannot be its own parent company." },
        { status: 400 },
      );
    }

    const parentCompany = await prisma.company.findFirst({
      where: {
        id: result.data.parentCompanyId,
      },
      select: {
        id: true,
        groupId: true,
      },
    });

    if (!parentCompany) {
      return NextResponse.json(
        { message: "That parent company could not be found." },
        { status: 400 },
      );
    }

    const nextGroupId = result.data.groupId || company.groupId;

    if (nextGroupId && parentCompany.groupId && parentCompany.groupId !== nextGroupId) {
      return NextResponse.json(
        { message: "Parent and child companies need to sit inside the same group." },
        { status: 400 },
      );
    }
  }

  await prisma.company.update({
    where: {
      id: viewer.company.id,
    },
    data: {
      legalForm: result.data.legalForm,
      groupId: result.data.groupId || null,
      parentCompanyId: result.data.parentCompanyId || null,
      bankIban: result.data.bankIban || null,
      bankBic: result.data.bankBic || null,
      bankExportProfile: result.data.bankExportProfile,
      companyType: result.data.companyType,
      isHoldingCompany:
        result.data.companyType === "HOLDING" ? true : result.data.isHoldingCompany,
    },
  });

  return NextResponse.json({ ok: true });
}
