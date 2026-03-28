import { notFound } from "next/navigation";
import { projectCommercialBasisOptions } from "@/lib/project-management";
import { canManageProjects, getRoleLabel, requireWorkspaceAccess } from "@/lib/access";
import { getProjectBillableMaterials, getProjectBillableTime, getProjectBillingSummary } from "@/lib/billing";
import { getProjectCommercialSummary } from "@/lib/commercial";
import { getProjectForViewer } from "@/lib/project-management";
import { prisma } from "@/lib/prisma";
import { getActiveTemplates } from "@/lib/templates";
import { getWorkloadBadgeMap } from "@/lib/workload";
import { ProjectDetailPage } from "@/components/projects/project-detail-page";

function formatTotalDuration(
  entries: Array<{ startTime: Date; endTime: Date | null }>,
) {
  const totalMinutes = entries.reduce((sum, entry) => {
    const end = entry.endTime ?? new Date();
    return sum + Math.max(0, Math.round((end.getTime() - entry.startTime.getTime()) / 60000));
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export default async function ProjectDetailWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string; projectId: string }>;
}) {
  const { companySlug, projectId } = await params;
  const viewer = await requireWorkspaceAccess(companySlug);
  const project = await getProjectForViewer(viewer, projectId);

  if (!project) {
    notFound();
  }

  const [teamMembers, taskTemplates, customers, quoteOptions] = canManageProjects(viewer.role)
    ? await Promise.all([
        prisma.user.findMany({
          where: {
            companyId: viewer.company.id,
            status: {
              not: "INACTIVE",
            },
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            role: true,
          },
        }),
        getActiveTemplates({
          companyId: viewer.company.id,
          templateType: "TASK_TEMPLATE",
        }),
        prisma.customer.findMany({
          where: {
            companyId: viewer.company.id,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
          },
        }),
        prisma.quote.findMany({
          where: {
            companyId: viewer.company.id,
            status: "ACCEPTED",
            OR: [{ projectId: null }, { id: project.quoteId ?? "" }],
          },
          orderBy: [{ issueDate: "desc" }],
          select: {
            id: true,
            quoteNumber: true,
            title: true,
          },
        }),
      ])
    : [[], [], [], []];
  const [projectInvoices, materialEntries, billingSummary, billableTimeRows, billableMaterialRows, linkedQuote] = canManageProjects(viewer.role)
    ? await Promise.all([
        prisma.invoice.findMany({
          where: {
            companyId: viewer.company.id,
            projectId: project.id,
          },
          orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
          take: 6,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            dueDate: true,
            totalGross: true,
            paidAmount: true,
          },
        }),
        prisma.materialEntry.findMany({
          where: {
            companyId: viewer.company.id,
            projectId: project.id,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ createdAt: "desc" }],
          take: 10,
        }),
        getProjectBillingSummary(project.id, viewer.company.id),
        getProjectBillableTime(project.id, { companyId: viewer.company.id }),
        getProjectBillableMaterials(project.id, { companyId: viewer.company.id }),
        project.quoteId
          ? prisma.quote.findFirst({
              where: {
                id: project.quoteId,
                companyId: viewer.company.id,
              },
              select: {
                id: true,
                quoteNumber: true,
                status: true,
                totalNet: true,
                totalGross: true,
              },
            })
          : Promise.resolve(null),
      ])
    : [[], [], null, [], [], null];
  const workloadMap = canManageProjects(viewer.role)
    ? await getWorkloadBadgeMap(viewer)
    : {};
  const commercialSummary = billingSummary
    ? getProjectCommercialSummary({
        commercialBasisType: project.commercialBasisType,
        budgetNet: project.budgetNet,
        budgetGross: project.budgetGross,
        budgetLaborValue: project.budgetLaborValue,
        budgetMaterialValue: project.budgetMaterialValue,
        quote: linkedQuote,
        billingSummary,
      })
    : null;

  return (
    <ProjectDetailPage
      companySlug={viewer.company.slug}
      canManage={canManageProjects(viewer.role)}
      viewerRole={viewer.role}
      project={{
        ...project,
        budgetNet: project.budgetNet?.toString() ?? null,
        budgetGross: project.budgetGross?.toString() ?? null,
        budgetLaborValue: project.budgetLaborValue?.toString() ?? null,
        budgetMaterialValue: project.budgetMaterialValue?.toString() ?? null,
        linkedQuote: linkedQuote
          ? {
              id: linkedQuote.id,
              quoteNumber: linkedQuote.quoteNumber,
              status: linkedQuote.status,
              totalGross: linkedQuote.totalGross.toString(),
            }
          : null,
        projectInvoices: projectInvoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          dueDate: invoice.dueDate,
          totalGross: invoice.totalGross.toString(),
          paidAmount: invoice.paidAmount.toString(),
        })),
        billingSummary: billingSummary
          ? {
              ...billingSummary,
              unbilledTimeValue: billingSummary.unbilledTimeValue.toString(),
              unbilledMaterialValue: billingSummary.unbilledMaterialValue.toString(),
              totalUnbilledValue: billingSummary.totalUnbilledValue.toString(),
              totalBilledAmount: billingSummary.totalBilledAmount.toString(),
              totalPaidAmount: billingSummary.totalPaidAmount.toString(),
              outstandingReceivables: billingSummary.outstandingReceivables.toString(),
              remainingBillableAmount: billingSummary.remainingBillableAmount.toString(),
            }
          : null,
        billableTimeRows: billableTimeRows.map((entry) => {
          const totalHours = Math.max(
            0,
            Math.round((((entry.endTime ?? entry.startTime).getTime()) - entry.startTime.getTime()) / 60000),
          ) / 60;
          const hours = Math.max(0, totalHours - Number(entry.invoicedQuantity?.toString() ?? "0"));
          return {
            id: entry.id,
            date: entry.date.toISOString(),
            description: entry.task?.title ?? "Projektarbete",
            userName: entry.user.name,
            hours: hours.toFixed(2),
            value: entry.hourlyRate ? entry.hourlyRate.mul(hours).toString() : "0",
          };
        }),
        billableMaterialRows: billableMaterialRows.map((entry) => ({
          id: entry.id,
          date: (entry.receiptDate ?? entry.createdAt).toISOString(),
          description: entry.description,
          quantity: entry.quantity.sub(entry.invoicedQuantity).toString(),
          value: entry.quantity.sub(entry.invoicedQuantity).mul(entry.unitPrice).toString(),
        })),
        materialEntries: materialEntries.map((entry) => ({
          id: entry.id,
          description: entry.description,
          quantity: entry.quantity.toString(),
          unitCost: entry.unitCost.toString(),
          unitPrice: entry.unitPrice.toString(),
          isBillable: entry.isBillable,
          invoiced: entry.invoiced,
          receiptUrl: entry.receiptUrl,
          createdAt: entry.createdAt,
          user: {
            id: entry.user.id,
            name: entry.user.name,
          },
        })),
        commercialSummary: commercialSummary
          ? {
              agreedGross: commercialSummary.agreedGross.toString(),
              billed: commercialSummary.billed.toString(),
              paid: commercialSummary.paid.toString(),
              unbilled: commercialSummary.unbilled.toString(),
              outstanding: commercialSummary.outstanding.toString(),
              derivedProjectValue: commercialSummary.derivedProjectValue.toString(),
              remainingCommercialRoom: commercialSummary.remainingCommercialRoom.toString(),
              basisLabel: commercialSummary.basisLabel,
              varianceLabel: commercialSummary.varianceLabel,
              varianceTone: commercialSummary.varianceTone,
              laborBudget: commercialSummary.laborBudget.toString(),
              materialBudget: commercialSummary.materialBudget.toString(),
            }
          : null,
      }}
      totalDurationLabel={formatTotalDuration(project.timeEntries)}
      teamMembers={
        canManageProjects(viewer.role)
          ? teamMembers.map((member) => ({
              id: member.id,
              name: member.name,
              roleLabel: getRoleLabel(member.role),
            }))
          : project.assignments.map((assignment) => ({
              id: assignment.user.id,
              name: assignment.user.name,
              roleLabel: getRoleLabel(assignment.user.role),
            }))
      }
      taskAssigneeOptions={[
        { label: "Unassigned", value: "" },
        ...project.assignments.map((assignment) => ({
          label: `${assignment.user.name}${workloadMap[assignment.user.id] ? ` - ${workloadMap[assignment.user.id].label}` : ""}`,
          value: assignment.user.id,
        })),
      ]}
      followUpOwnerOptions={project.assignments.map((assignment) => ({
        label: assignment.user.name,
        value: assignment.user.id,
      }))}
      preventiveActionOwnerOptions={project.assignments.map((assignment) => ({
        label: assignment.user.name,
        value: assignment.user.id,
      }))}
      taskTemplateOptions={taskTemplates.map((template) => ({
        label: template.title,
        value: template.id,
      }))}
      customerOptions={customers.map((customer) => ({
        label: customer.name,
        value: customer.id,
      }))}
      quoteOptions={quoteOptions.map((quote) => ({
        label: `${quote.quoteNumber} · ${quote.title}`,
        value: quote.id,
      }))}
      commercialBasisOptions={projectCommercialBasisOptions}
    />
  );
}
