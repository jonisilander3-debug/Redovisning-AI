import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  reviewAccountingSuggestion,
  reviewAccountingSuggestionSchema,
} from "@/lib/accounting-suggestions";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; suggestionId: string }>;
  },
) {
  const { companySlug, suggestionId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can review accounting suggestions." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = reviewAccountingSuggestionSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please choose how to handle this suggestion." },
      { status: 400 },
    );
  }

  try {
    const response = await reviewAccountingSuggestion({
      companyId: viewer.company.id,
      suggestionId,
      reviewerId: viewer.id,
      input: result.data,
    });

    return NextResponse.json({ ok: true, ...response });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not handle that suggestion right now.",
      },
      { status: 400 },
    );
  }
}
