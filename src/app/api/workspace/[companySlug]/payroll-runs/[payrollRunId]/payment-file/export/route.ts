import { requireProjectManagementAccess } from "@/lib/access";
import { generatePayrollBankFile } from "@/lib/banking";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; payrollRunId: string }>;
  },
) {
  const { companySlug, payrollRunId } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);
  try {
    const profile = new URL(request.url).searchParams.get("profile");
    const file = await generatePayrollBankFile(
      viewer.company.id,
      payrollRunId,
      profile === "BANKGIROT_LON" ? "BANKGIROT_LON" : profile === "PAIN_001" ? "PAIN_001" : undefined,
    );
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename=\"${file.filename}\"`,
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Payroll export could not be generated.",
      { status: 400 },
    );
  }
}
