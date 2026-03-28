import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { finalizePayrollRun } from "@/lib/payroll";

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
      { message: "Only company managers can finalize payroll runs." },
      { status: 403 },
    );
  }

  try {
    const payrollRun = await finalizePayrollRun(payrollRunId, viewer.company.id);

    return NextResponse.json({
      ok: true,
      payrollRunId: payrollRun.id,
      journalEntryId: payrollRun.journalEntryId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not finalize this payroll run.",
      },
      { status: 400 },
    );
  }
}
