import { NextResponse } from "next/server";
import { QuoteStatus } from "@prisma/client";
import { z } from "zod";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.nativeEnum(QuoteStatus),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companySlug: string; quoteId: string }> },
) {
  const { companySlug, quoteId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }
  if (!canManageProjects(viewer.role)) {
    return NextResponse.json({ message: "Only managers can update quote status." }, { status: 403 });
  }

  const result = schema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ message: "Ogiltig offertstatus." }, { status: 400 });
  }

  await prisma.quote.updateMany({
    where: {
      id: quoteId,
      companyId: viewer.company.id,
    },
    data: {
      status: result.data.status,
      acceptedAt: result.data.status === "ACCEPTED" ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
