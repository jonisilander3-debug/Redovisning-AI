import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { buildUniqueCompanySlug, onboardingSchema } from "@/lib/company";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = onboardingSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { message: "Please complete all required details." },
        { status: 400 },
      );
    }

    const { fullName, email, password, companyName, organizationNumber, legalForm } =
      result.data;

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const existingCompany = await prisma.company.findUnique({
      where: { organizationNumber },
    });

    if (existingCompany) {
      return NextResponse.json(
        { message: "That organization number is already connected to a workspace." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    const companySlug = await buildUniqueCompanySlug(companyName);

    const company = await prisma.company.create({
      data: {
        name: companyName,
        slug: companySlug,
        organizationNumber,
        legalForm,
        companyType: "OPERATING",
      },
    });

    await prisma.user.create({
      data: {
        companyId: company.id,
        name: fullName,
        email: normalizedEmail,
        passwordHash,
        role: "OWNER",
        status: "ACTIVE",
        companyMemberships: {
          create: {
            companyId: company.id,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      companySlug: company.slug,
      email: normalizedEmail,
    });
  } catch {
    return NextResponse.json(
      { message: "Something went wrong while creating the workspace." },
      { status: 500 },
    );
  }
}
