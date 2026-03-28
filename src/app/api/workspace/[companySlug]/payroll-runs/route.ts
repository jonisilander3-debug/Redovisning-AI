import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { createPayrollRun } from "@/lib/payroll";

const createPayrollRunSchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

function parseDateInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can create payroll runs." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createPayrollRunSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please choose a valid payroll period first." },
      { status: 400 },
    );
  }

  const periodStart = parseDateInput(result.data.periodStart);
  const periodEnd = parseDateInput(result.data.periodEnd);

  if (!periodStart || !periodEnd) {
    return NextResponse.json(
      { message: "Please provide a valid payroll period." },
      { status: 400 },
    );
  }

  try {
    const payrollRun = await createPayrollRun(viewer.company.id, periodStart, periodEnd);
    return NextResponse.json({ ok: true, payrollRunId: payrollRun.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not create that payroll run.",
      },
      { status: 400 },
    );
  }
}
