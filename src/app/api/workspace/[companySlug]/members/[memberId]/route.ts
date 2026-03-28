import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer } from "@/lib/access";
import {
  assertMemberManagementAllowed,
  updateMemberSchema,
} from "@/lib/member-management";
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

  if (viewer.role !== "OWNER" && viewer.role !== "ADMIN") {
    return NextResponse.json(
      { message: "Only company owners and admins can manage members." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = updateMemberSchema.safeParse(json);

  if (
    !result.success ||
    (!result.data.role &&
      !result.data.status &&
      typeof result.data.defaultDailyCapacityHours !== "number" &&
      typeof result.data.weeklyCapacityHours !== "number" &&
      !result.data.salaryType &&
      typeof result.data.hourlyRate !== "number" &&
      typeof result.data.monthlySalary !== "number" &&
      typeof result.data.taxPercent !== "number" &&
      typeof result.data.employerContributionRate !== "number" &&
      typeof result.data.bankIban !== "string")
  ) {
    return NextResponse.json(
      { message: "Choose a valid member update first." },
      { status: 400 },
    );
  }

  try {
    await assertMemberManagementAllowed({
      actingRole: viewer.role,
      targetUserId: memberId,
      companyId: viewer.company.id,
      nextRole: result.data.role,
      nextStatus: result.data.status,
    });

    const updatedUser = await prisma.user.update({
      where: { id: memberId },
      data: {
        ...(result.data.status ? { status: result.data.status } : {}),
        ...(typeof result.data.defaultDailyCapacityHours === "number"
          ? { defaultDailyCapacityHours: result.data.defaultDailyCapacityHours }
          : {}),
        ...(typeof result.data.weeklyCapacityHours === "number"
          ? { weeklyCapacityHours: result.data.weeklyCapacityHours }
          : {}),
        ...(result.data.salaryType ? { salaryType: result.data.salaryType } : {}),
        ...(typeof result.data.hourlyRate === "number"
          ? { hourlyRate: result.data.hourlyRate }
          : {}),
        ...(typeof result.data.monthlySalary === "number"
          ? { monthlySalary: result.data.monthlySalary }
          : {}),
        ...(typeof result.data.taxPercent === "number"
          ? { taxPercent: result.data.taxPercent }
          : {}),
        ...(typeof result.data.employerContributionRate === "number"
          ? { employerContributionRate: result.data.employerContributionRate }
          : {}),
        ...(typeof result.data.bankIban === "string"
          ? { bankIban: result.data.bankIban || null }
          : {}),
        ...(result.data.role
          ? {
              companyMemberships: {
                updateMany: {
                  where: {
                    companyId: viewer.company.id,
                  },
                  data: {
                    role: result.data.role,
                  },
                },
              },
            }
          : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      id: updatedUser.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not update that member.",
      },
      { status: 400 },
    );
  }
}
