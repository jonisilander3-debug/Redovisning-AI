import { NextResponse } from "next/server";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createYearEndTaxJournalEntry, createYearEndTaxEntrySchema } from "@/lib/year-end";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const json = await request.json();
  const result = createYearEndTaxEntrySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Valj ett giltigt rakenskapsar for bokslutsposten." },
      { status: 400 },
    );
  }

  try {
    const company = await prisma.company.findUniqueOrThrow({
      where: {
        id: viewer.company.id,
      },
      select: {
        legalForm: true,
      },
    });

    const entry = await createYearEndTaxJournalEntry(
      viewer.company.id,
      company.legalForm,
      result.data.year,
    );

    return NextResponse.json({ ok: true, journalEntryId: entry.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Vi kunde inte skapa arsbokslutsposten.",
      },
      { status: 400 },
    );
  }
}
