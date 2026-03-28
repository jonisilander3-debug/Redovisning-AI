import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import { slugifyCompanyName } from "@/lib/company";
import {
  createGroupCompanySchema,
  getGroupContextByCompanyId,
  getNormalizedCompanyPlacement,
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
      { message: "Only owners and admins can create companies in the group." },
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
  const result = createGroupCompanySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the company details first." },
      { status: 400 },
    );
  }

  const normalizedSlug = slugifyCompanyName(result.data.slug);

  if (!normalizedSlug || normalizedSlug.length < 2) {
    return NextResponse.json(
      { message: "Choose a short, clear company slug." },
      { status: 400 },
    );
  }

  const [existingSlug, existingOrganizationNumber] = await Promise.all([
    prisma.company.findUnique({
      where: {
        slug: normalizedSlug,
      },
      select: {
        id: true,
      },
    }),
    prisma.company.findUnique({
      where: {
        organizationNumber: result.data.organizationNumber,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (existingSlug) {
    return NextResponse.json(
      { message: "That company slug is already in use." },
      { status: 409 },
    );
  }

  if (existingOrganizationNumber) {
    return NextResponse.json(
      { message: "That organization number is already connected to a company." },
      { status: 409 },
    );
  }

  const placement = getNormalizedCompanyPlacement({
    legalForm: result.data.legalForm,
    companyType: result.data.companyType,
    parentCompanyId: result.data.parentCompanyId,
  });

  if (placement.parentCompanyId) {
    const parentCompany = await prisma.company.findFirst({
      where: {
        id: placement.parentCompanyId,
        groupId: groupContext.group.id,
      },
      select: {
        id: true,
      },
    });

    if (!parentCompany) {
      return NextResponse.json(
        { message: "Choose a parent company inside the same group." },
        { status: 400 },
      );
    }
  }

  const company = await prisma.company.create({
    data: {
      name: result.data.name,
      slug: normalizedSlug,
      organizationNumber: result.data.organizationNumber,
      legalForm: result.data.legalForm,
      groupId: groupContext.group.id,
      companyType: placement.companyType,
      parentCompanyId: placement.parentCompanyId,
      isHoldingCompany: placement.isHoldingCompany,
      memberships: {
        create: {
          userId: viewer.id,
          role: viewer.role,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  return NextResponse.json({
    ok: true,
    companyId: company.id,
    companySlug: company.slug,
    companyName: company.name,
  });
}
