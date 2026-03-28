import { ProjectCommercialBasisType, ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { canManageProjects, isEmployeeRole, type WorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export const projectStatusOptions = Object.entries(projectStatusLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const projectCommercialBasisLabels: Record<ProjectCommercialBasisType, string> = {
  QUOTE: "Offert",
  MANUAL: "Manuell budget",
  RUNNING_WORK: "Löpande arbete",
};

export const projectCommercialBasisOptions = Object.entries(projectCommercialBasisLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const baseProjectSchema = z.object({
  customerId: z.string().optional().transform((value) => value || ""),
  customerName: z.string().trim().min(2).max(120),
  quoteId: z.string().optional().transform((value) => value || ""),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().transform((value) => value || ""),
  status: z.nativeEnum(ProjectStatus),
  commercialBasisType: z.nativeEnum(ProjectCommercialBasisType).default("RUNNING_WORK"),
  budgetNet: z.coerce.number().min(0).optional(),
  budgetGross: z.coerce.number().min(0).optional(),
  budgetLaborValue: z.coerce.number().min(0).optional(),
  budgetMaterialValue: z.coerce.number().min(0).optional(),
  startDate: z.string().optional().transform((value) => value || ""),
  endDate: z.string().optional().transform((value) => value || ""),
  location: z.string().trim().max(200).optional().transform((value) => value || ""),
});

export const createProjectSchema = baseProjectSchema.extend({
  assignedUserIds: z.array(z.string()).default([]),
  launchMode: z.enum(["SCRATCH", "TEMPLATE", "PRESET"]).default("SCRATCH"),
  templateId: z.string().optional().transform((value) => value || ""),
  presetId: z.string().optional().transform((value) => value || ""),
});

export const updateProjectSchema = baseProjectSchema.extend({
  assignedUserIds: z.array(z.string()).default([]),
  templateId: z.string().optional().transform((value) => value || ""),
});

export function getProjectStatusLabel(status: ProjectStatus) {
  return projectStatusLabels[status];
}

export function getProjectStatusTone(status: ProjectStatus) {
  if (status === "ACTIVE") {
    return "success" as const;
  }

  if (status === "ON_HOLD") {
    return "accent" as const;
  }

  if (status === "COMPLETED") {
    return "primary" as const;
  }

  return "default" as const;
}

export function parseOptionalDate(value?: string) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

export async function ensureAssignableUsersBelongToCompany(
  companyId: string,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      companyId,
      id: { in: userIds },
      status: {
        not: "INACTIVE",
      },
    },
    select: {
      id: true,
    },
  });

  if (users.length !== userIds.length) {
    throw new Error("One or more selected team members cannot be assigned.");
  }

  return users;
}

export async function getVisibleProjectsForViewer(viewer: WorkspaceViewer) {
  if (canManageProjects(viewer.role)) {
    return prisma.project.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        kickoffCompletedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        kickoffFocusTasks: {
          include: {
            task: {
              include: {
                assignedUser: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        activityEvents: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 6,
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            timeEntries: true,
            tasks: true,
          },
        },
        tasks: {
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
              },
            },
            checklistItems: {
              include: {
                assignedUser: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
            taskNotes: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
            timelineEvents: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 8,
            },
            blockers: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                followUpOwner: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                verifiedBy: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                preventiveActions: {
                  include: {
                    owner: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                  orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
                },
              },
              orderBy: [{ status: "asc" }, { createdAt: "desc" }],
            },
            preventiveActions: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                sourceBlocker: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
              orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
            },
            appliedImprovements: {
              include: {
                executionImprovement: {
                  include: {
                    sourcePreventiveAction: {
                      select: {
                        id: true,
                        title: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
        },
        preventiveActions: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
            sourceBlocker: {
              select: {
                id: true,
                title: true,
                taskId: true,
              },
            },
            relatedTask: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        },
        executionImprovements: {
          include: {
            sourcePreventiveAction: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
  }

  return prisma.project.findMany({
    where: {
      companyId: viewer.company.id,
      assignments: {
        some: {
          userId: viewer.id,
        },
      },
    },
    include: {
      kickoffCompletedBy: {
        select: {
          id: true,
          name: true,
        },
      },
      kickoffFocusTasks: {
        include: {
          task: {
            include: {
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      activityEvents: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      },
      assignments: {
        where: {
          userId: viewer.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          timeEntries: true,
          tasks: true,
        },
      },
      tasks: {
        where: {
          OR: [{ assignedUserId: viewer.id }, { assignedUserId: null }],
        },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
            },
          },
          checklistItems: {
            where: {
              OR: [{ assignedUserId: viewer.id }, { assignedUserId: null }],
            },
            include: {
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          taskNotes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          timelineEvents: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 8,
          },
          blockers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
              followUpOwner: {
                select: {
                  id: true,
                  name: true,
                },
              },
              verifiedBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
              preventiveActions: {
                where: {
                  OR: [{ ownerId: viewer.id }, { status: "ACTIVE" }, { status: "DONE" }],
                },
                include: {
                  owner: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
                orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
              },
            },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          },
          preventiveActions: {
            where: {
              OR: [{ ownerId: viewer.id }, { status: "ACTIVE" }],
            },
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                },
              },
              sourceBlocker: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          },
          appliedImprovements: {
            include: {
              executionImprovement: {
                include: {
                  sourcePreventiveAction: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
      },
      preventiveActions: {
        where: {
          OR: [{ ownerId: viewer.id }, { status: "ACTIVE" }],
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          sourceBlocker: {
            select: {
              id: true,
              title: true,
              taskId: true,
            },
          },
          relatedTask: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      },
      executionImprovements: {
        where: {
          appliesToFutureTasks: true,
          status: {
            in: ["PROPOSED", "APPLIED"],
          },
        },
        include: {
          sourcePreventiveAction: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getProjectForViewer(
  viewer: WorkspaceViewer,
  projectId: string,
) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: viewer.company.id,
      ...(isEmployeeRole(viewer.role)
        ? {
            assignments: {
              some: {
                userId: viewer.id,
              },
            },
          }
        : {}),
    },
    include: {
      kickoffCompletedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      kickoffFocusTasks: {
        include: {
          task: {
            include: {
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      activityEvents: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      tasks: {
        where: isEmployeeRole(viewer.role)
          ? {
              OR: [{ assignedUserId: viewer.id }, { assignedUserId: null }],
            }
          : undefined,
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          checklistItems: {
            where: isEmployeeRole(viewer.role)
              ? {
                  OR: [{ assignedUserId: viewer.id }, { assignedUserId: null }],
                }
              : undefined,
            include: {
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          taskNotes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          timelineEvents: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          blockers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              followUpOwner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              verifiedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              preventiveActions: {
                where: isEmployeeRole(viewer.role)
                  ? {
                      OR: [{ ownerId: viewer.id }, { status: "ACTIVE" }, { status: "DONE" }],
                    }
                  : undefined,
                include: {
                  owner: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
                orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
              },
            },
            where: isEmployeeRole(viewer.role)
              ? {
                  OR: [{ userId: viewer.id }, { status: "OPEN" }, { status: "RESOLVED" }],
                }
              : undefined,
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          },
          preventiveActions: {
            where: isEmployeeRole(viewer.role)
              ? {
                  OR: [{ ownerId: viewer.id }, { status: "ACTIVE" }],
                }
              : undefined,
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              sourceBlocker: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          },
          appliedImprovements: {
            include: {
              executionImprovement: {
                include: {
                  sourcePreventiveAction: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          _count: {
            select: {
              timeEntries: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
      },
      timeEntries: {
        where: isEmployeeRole(viewer.role)
          ? {
              userId: viewer.id,
            }
          : undefined,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
        take: 10,
      },
      _count: {
        select: {
          timeEntries: true,
        },
      },
      preventiveActions: {
        where: isEmployeeRole(viewer.role)
          ? {
              OR: [{ ownerId: viewer.id }, { status: "ACTIVE" }],
            }
          : undefined,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sourceBlocker: {
            select: {
              id: true,
              title: true,
              taskId: true,
            },
          },
          relatedTask: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      },
      executionImprovements: {
        where: isEmployeeRole(viewer.role)
          ? {
              status: {
                in: ["APPLIED"],
              },
            }
          : undefined,
        include: {
          sourcePreventiveAction: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      },
    },
  });
}
