import { NextResponse } from "next/server";
import { requireProjectManagementAccess } from "@/lib/access";
import { createInk2RunSchema, createOrRefreshInk2Run } from "@/lib/ink2";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const json = await request.json();
  const result = createInk2RunSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json({ message: "Choose a valid financial year." }, { status: 400 });
  }

  try {
    const run = await createOrRefreshInk2Run(viewer.company.id, result.data.year);
    return NextResponse.json({ ok: true, ink2RunId: run.id });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "INK2-underlaget kunde inte skapas.",
      },
      { status: 400 },
    );
  }
}
