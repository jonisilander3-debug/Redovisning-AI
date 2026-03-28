import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can view invoices." },
      { status: 403 },
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          lines: true,
        },
      },
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ invoices });
}
