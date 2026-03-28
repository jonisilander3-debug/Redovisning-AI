import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { markPayrollRunPaid } from "@/lib/payroll";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; payrollRunId: string }>;
  },
) {
  const { companySlug, payrollRunId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can mark payroll as paid." },
      { status: 403 },
    );
  }

  try {
    const payrollRun = await markPayrollRunPaid(payrollRunId, viewer.company.id);
    return NextResponse.json({ ok: true, payrollRunId: payrollRun.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not mark this payroll run as paid.",
      },
      { status: 400 },
    );
  }
}
