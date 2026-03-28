import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getNavigationItems } from "@/lib/navigation";
import { requireWorkspaceAccess } from "@/lib/access";

export default async function WorkspaceSectionPage({
  params,
}: {
  params: Promise<{ companySlug: string; section: string }>;
}) {
  const { companySlug, section } = await params;
  const viewer = await requireWorkspaceAccess(companySlug);
  const items = getNavigationItems(companySlug, viewer.role);
  const currentItem = items.find((item) => item.href.endsWith(`/${section}`));

  if (!currentItem) {
    notFound();
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Coming next"
        title={currentItem.label}
        description={`This area is already reserved in ${viewer.company.name} so the product can grow with a clean structure and role-aware navigation.`}
        actions={
          <Link
            href={`/workspace/${companySlug}`}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
          >
            Return to overview
          </Link>
        }
      />
      <EmptyState
        title={`${currentItem.label} will be added in a later product step`}
        description="The workspace, company structure, and roles are in place now, so future modules can plug into the app without needing a new navigation model."
        action={
          <Link
            href={`/workspace/${companySlug}`}
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.8)] transition-colors hover:bg-[#1d4ed8]"
          >
            Stay on roadmap
          </Link>
        }
      />
    </div>
  );
}
