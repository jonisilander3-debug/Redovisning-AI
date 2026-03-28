import {
  BackofficeCasePackCategory,
  BackofficeCasePackChecklistItemType,
  BackofficeCasePackStatus,
  BackofficeDocumentCategory,
  BackofficeDocumentStatus,
  BackofficeFollowUpCategory,
  BackofficeRole,
  CompanyAdoptionFollowUpOutcomeStatus,
  CompanyAdoptionFollowUpReviewStatus,
  CompanyAdoptionFollowUpStatus,
  CompanyType,
  DEMO_PASSWORD,
  InvoiceMode,
  InvoiceStatus,
  ProjectCommercialBasisType,
  ProjectStatus,
  SalaryType,
  TaskPriority,
  TaskStatus,
  UserRole,
  WorkingPaperCategory,
  WorkingPaperStatus,
  addDays,
  atTime,
  buildInvoiceNumber,
  buildQuoteNumber,
  createAdoptionFollowUp,
  createBackofficeDocument,
  createBackofficeFollowUp,
  createBackofficeNote,
  createCasePack,
  createCompany,
  createEmployerDeclarationRun,
  createInvoiceWithLines,
  createMaterialJournalEntry,
  createPayrollJournalEntry,
  createUserWithMemberships,
  createVatReportRun,
  createWorkingPaper,
  decimal,
  endOfDay,
  logSeedSummary,
  prisma,
  registerInvoicePayment,
  resetDatabase,
  roundMoney,
  startOfDay,
} from "./shared.mts";

const TODAY = new Date("2026-03-28T10:00:00+01:00");

type CompanySeedContext = {
  company: Awaited<ReturnType<typeof createCompany>>;
  owner: { id: string; name: string };
  manager: { id: string; name: string };
  finance: { id: string; name: string };
  employees: Array<{ id: string; name: string; email: string }>;
  customers: Array<{ id: string; name: string }>;
  projects: Array<{
    id: string;
    title: string;
    customerId: string | null;
    customerName: string;
    timeEntries: string[];
    materialEntries: string[];
    invoices: string[];
  }>;
};

function uniqueOrg(index: number) {
  return `556${String(100000 + index).slice(-6)}-${String(1000 + index).slice(-4)}`;
}

async function createCompanyTeam(input: {
  companyId: string;
  companySlug: string;
  ownerName: string;
  managerName: string;
  financeName: string;
  employeeNames: string[];
  employeeRoleLabel: string;
  ownerMonthlySalary?: number;
  managerMonthlySalary?: number;
  financeMonthlySalary?: number;
  employeeHourlyRate?: number;
}) {
  const owner = await createUserWithMemberships({
    email: `owner@${input.companySlug}.demo`,
    name: input.ownerName,
    companyId: input.companyId,
    role: UserRole.OWNER,
    salaryType: SalaryType.MONTHLY,
    monthlySalary: input.ownerMonthlySalary ?? 52000,
  });

  const manager = await createUserWithMemberships({
    email: `manager@${input.companySlug}.demo`,
    name: input.managerName,
    companyId: input.companyId,
    role: UserRole.MANAGER,
    salaryType: SalaryType.MONTHLY,
    monthlySalary: input.managerMonthlySalary ?? 43000,
  });

  const finance = await createUserWithMemberships({
    email: `finance@${input.companySlug}.demo`,
    name: input.financeName,
    companyId: input.companyId,
    role: UserRole.ADMIN,
    salaryType: SalaryType.MONTHLY,
    monthlySalary: input.financeMonthlySalary ?? 39000,
  });

  const employees = [];
  for (const [index, employeeName] of input.employeeNames.entries()) {
    const emailBase = employeeName.toLowerCase().replace(/\s+/g, ".");
    employees.push(
      await createUserWithMemberships({
        email: `${emailBase}@${input.companySlug}.demo`,
        name: employeeName,
        companyId: input.companyId,
        role: UserRole.EMPLOYEE,
        salaryType: SalaryType.HOURLY,
        hourlyRate: input.employeeHourlyRate ?? 235 + index * 10,
      }),
    );
  }

  return { owner, manager, finance, employees };
}

async function createCustomers(companyId: string, companyKey: string, names: string[]) {
  const customers = [];
  for (const [index, name] of names.entries()) {
    const customer = await prisma.customer.create({
      data: {
        companyId,
        name,
        organizationNumber: uniqueOrg(index + companyId.length),
        contactPerson: `${name.split(" ")[0]} Kontakt`,
        email: `kontakt@${companyKey}${index + 1}.demo`,
        phone: `08-55${String(1000 + index).slice(-4)}`,
        addressLine1: `${name.split(" ")[0]}gatan ${index + 1}`,
        postalCode: `11${String(100 + index).slice(-3)}`,
        city: "Stockholm",
        invoiceTermsDays: 30,
        defaultHourlyRate: roundMoney(890 + index * 45),
      },
    });
    customers.push(customer);
  }
  return customers;
}

async function createQuoteAndProject(input: {
  companyId: string;
  customer: { id: string; name: string };
  title: string;
  description: string;
  status: ProjectStatus;
  commercialBasisType?: ProjectCommercialBasisType;
  budgetNet: number;
  startOffset: number;
  endOffset: number;
  acceptedQuote?: boolean;
  quoteNet?: number;
  quoteDescription?: string;
  location: string;
}) {
  let quoteId: string | null = null;
  if (input.acceptedQuote ?? true) {
    const quoteNet = roundMoney(input.quoteNet ?? input.budgetNet);
    const quoteVat = roundMoney(quoteNet.mul(decimal(0.25)));
    const quoteGross = roundMoney(quoteNet.add(quoteVat));
    const quote = await prisma.quote.create({
      data: {
        companyId: input.companyId,
        customerId: input.customer.id,
        quoteNumber: buildQuoteNumber(2026, Math.floor(Math.random() * 900) + 100),
        status: "ACCEPTED",
        title: input.title,
        description: input.quoteDescription ?? input.description,
        issueDate: addDays(TODAY, input.startOffset - 15),
        validUntil: addDays(TODAY, input.startOffset + 10),
        totalNet: quoteNet,
        totalVat: quoteVat,
        totalGross: quoteGross,
        acceptedAt: addDays(TODAY, input.startOffset - 10),
        lines: {
          create: [
            {
              type: "LABOR",
              description: `${input.title} - arbete`,
              quantity: roundMoney(1),
              unitPrice: quoteNet,
              vatRate: roundMoney(25),
              totalNet: quoteNet,
              totalVat: quoteVat,
              totalGross: quoteGross,
              sortOrder: 1,
            },
          ],
        },
      },
    });
    quoteId = quote.id;
  }

  const budgetNet = roundMoney(input.budgetNet);
  const budgetGross = roundMoney(budgetNet.mul(decimal(1.25)));
  return prisma.project.create({
    data: {
      companyId: input.companyId,
      customerId: input.customer.id,
      customerName: input.customer.name,
      quoteId,
      title: input.title,
      description: input.description,
      status: input.status,
      commercialBasisType: input.commercialBasisType ?? (quoteId ? "QUOTE" : "RUNNING_WORK"),
      budgetNet,
      budgetGross,
      budgetLaborValue: roundMoney(budgetNet.mul(decimal(0.68))),
      budgetMaterialValue: roundMoney(budgetNet.mul(decimal(0.32))),
      startDate: addDays(TODAY, input.startOffset),
      endDate: addDays(TODAY, input.endOffset),
      location: input.location,
      kickoffStatus: input.status === "PLANNED" ? "NOT_STARTED" : "COMPLETED",
      kickoffCompletedAt: input.status === "PLANNED" ? null : addDays(TODAY, input.startOffset + 2),
      kickoffNotes: "Demo-kickoff genomford med tydlig scope och uppfoljningsplan.",
    },
  });
}

async function seedProjectActivity(input: {
  companyId: string;
  project: { id: string; title: string; customerName: string; status: ProjectStatus };
  assignedUsers: Array<{ id: string; name: string }>;
  taskTitles: string[];
  baseHourlyRate: number;
  timePattern: Array<{ dayOffset: number; userIndex: number; hours: number; taskIndex: number; billable?: boolean; note: string }>;
  materialPattern?: Array<{ dayOffset: number; userIndex: number; description: string; quantity: number; unitCost: number; unitPrice: number; supplierName: string }>;
}) {
  const tasks = [];
  for (const [index, title] of input.taskTitles.entries()) {
    const task = await prisma.task.create({
      data: {
        companyId: input.companyId,
        projectId: input.project.id,
        title,
        description: `${title} for ${input.project.customerName}`,
        status:
          index === 0
            ? TaskStatus.DONE
            : index === input.taskTitles.length - 1 && input.project.status !== "COMPLETED"
              ? TaskStatus.TODO
              : TaskStatus.IN_PROGRESS,
        priority: index === 1 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
        assignedUserId: input.assignedUsers[index % input.assignedUsers.length]?.id ?? null,
        plannedStartDate: addDays(TODAY, -21 + index * 3),
        plannedEndDate: addDays(TODAY, -14 + index * 3),
        dueDate: addDays(TODAY, -7 + index * 4),
      },
    });

    await prisma.checklistItem.createMany({
      data: [
        {
          companyId: input.companyId,
          projectId: input.project.id,
          taskId: task.id,
          title: "Bekrafta scope med kund",
          status: "DONE",
          sortOrder: 1,
          assignedUserId: task.assignedUserId,
          completedAt: addDays(TODAY, -18),
        },
        {
          companyId: input.companyId,
          projectId: input.project.id,
          taskId: task.id,
          title: "Sakra underlag och arbetsorder",
          status: index === 0 ? "DONE" : "TODO",
          sortOrder: 2,
          assignedUserId: task.assignedUserId,
          completedAt: index === 0 ? addDays(TODAY, -16) : null,
        },
      ],
    });
    tasks.push(task);
  }

  for (const user of input.assignedUsers) {
    await prisma.projectAssignment.create({
      data: {
        projectId: input.project.id,
        userId: user.id,
      },
    });
  }

  const timeEntries = [];
  for (const row of input.timePattern) {
    const workDate = addDays(TODAY, row.dayOffset);
    const startTime = atTime(workDate, 7 + (row.userIndex % 3), 30);
    const entry = await prisma.timeEntry.create({
      data: {
        companyId: input.companyId,
        userId: input.assignedUsers[row.userIndex].id,
        projectId: input.project.id,
        taskId: tasks[row.taskIndex].id,
        hourlyRate: roundMoney(input.baseHourlyRate + row.userIndex * 55),
        isBillable: row.billable ?? true,
        date: workDate,
        startTime,
        endTime: new Date(startTime.getTime() + row.hours * 3600 * 1000),
        status: "COMPLETED",
        note: row.note,
      },
    });
    timeEntries.push(entry);
  }

  const materialEntries: Awaited<ReturnType<typeof prisma.materialEntry.create>>[] = [];
  let materialIndex = 0;
  for (const row of input.materialPattern ?? []) {
    const receiptDate = addDays(TODAY, row.dayOffset);
    const material = await prisma.materialEntry.create({
      data: {
        companyId: input.companyId,
        projectId: input.project.id,
        userId: input.assignedUsers[row.userIndex].id,
        description: row.description,
        quantity: roundMoney(row.quantity),
        unitCost: roundMoney(row.unitCost),
        unitPrice: roundMoney(row.unitPrice),
        isBillable: true,
        supplierName: row.supplierName,
        vatRate: roundMoney(25),
        receiptDate,
        receiptUrl: `/demo/receipts/${input.project.id}-${materialIndex + 1}.pdf`,
        accountingStatus: "BOOKED",
      },
    });

    const journalEntry = await createMaterialJournalEntry({
      companyId: input.companyId,
      materialEntryId: material.id,
      date: receiptDate,
      description: material.description,
      quantity: material.quantity,
      unitCost: material.unitCost,
      vatRate: material.vatRate ?? roundMoney(25),
      supplierName: material.supplierName,
    });

    await prisma.materialEntry.update({
      where: { id: material.id },
      data: {
        journalEntryId: journalEntry.id,
      },
    });

    materialEntries.push(material);
    materialIndex += 1;
  }

  return { tasks, timeEntries, materialEntries };
}

async function createPayrollRunFromUsers(input: {
  companyId: string;
  title: string;
  periodStart: Date;
  periodEnd: Date;
  employees: Array<{ id: string; salaryType: SalaryType; hourlyRate?: number | null; monthlySalary?: number | null }>;
  paymentReady?: boolean;
  markPaid?: boolean;
}) {
  const periodEntries = await prisma.timeEntry.findMany({
    where: {
      companyId: input.companyId,
      status: "COMPLETED",
      date: {
        gte: startOfDay(input.periodStart),
        lte: endOfDay(input.periodEnd),
      },
      userId: {
        in: input.employees.map((employee) => employee.id),
      },
    },
  });

  const absenceEntries = await prisma.absenceEntry.findMany({
    where: {
      companyId: input.companyId,
      status: "APPROVED",
      startDate: {
        lte: endOfDay(input.periodEnd),
      },
      endDate: {
        gte: startOfDay(input.periodStart),
      },
    },
  });

  const benefitEntries = await prisma.benefitEntry.findMany({
    where: {
      companyId: input.companyId,
      status: "APPROVED",
      date: {
        gte: startOfDay(input.periodStart),
        lte: endOfDay(input.periodEnd),
      },
    },
  });

  const lineDrafts = input.employees.map((employee, index) => {
    const entries = periodEntries.filter((entry) => entry.userId === employee.id);
    const workedHours = entries.reduce((sum, entry) => {
      const hours = ((entry.endTime ?? entry.startTime).getTime() - entry.startTime.getTime()) / 3600000;
      return sum + Math.max(0, hours);
    }, 0);
    const absenceHours = absenceEntries
      .filter((entry) => entry.userId === employee.id)
      .reduce((sum, entry) => sum + Number(entry.quantityHours ?? decimal(Number(entry.quantityDays ?? 0)).mul(8)), 0);
    const benefitsAmount = benefitEntries
      .filter((entry) => entry.userId === employee.id)
      .reduce((sum, entry) => sum.add(entry.taxableAmount), decimal(0));
    const hourlyRate = employee.salaryType === "HOURLY" ? employee.hourlyRate ?? 220 : (employee.monthlySalary ?? 38000) / 160;
    const baseGross =
      employee.salaryType === "HOURLY"
        ? workedHours * hourlyRate
        : employee.monthlySalary ?? 38000;
    const absenceAdjustment = Math.min(baseGross * 0.12, absenceHours * hourlyRate * 0.8);
    const grossSalary = roundMoney(baseGross - absenceAdjustment + Number(benefitsAmount));
    const taxAmount = roundMoney(decimal(grossSalary).mul(0.3));
    const employerContribution = roundMoney(decimal(grossSalary).mul(0.3142));
    const netSalary = roundMoney(decimal(grossSalary).sub(taxAmount));

    return {
      employee,
      workedHours: roundMoney(workedHours),
      grossSalary,
      taxAmount,
      employerContribution,
      netSalary,
      absenceHours: roundMoney(absenceHours),
      absenceAdjustmentAmount: roundMoney(absenceAdjustment),
      benefitsAmount: roundMoney(benefitsAmount),
      paymentStatus: input.markPaid ? "PAID" : input.paymentReady ? "PAYMENT_FILE_READY" : "UNPAID",
      paidAt: input.markPaid ? addDays(input.periodEnd, 4) : null,
      payoutReference: `${input.periodEnd.toISOString().slice(0, 10)}-${String(index + 1).padStart(2, "0")}`,
      timeEntryIds: entries.map((entry) => entry.id),
    };
  });

  const totals = lineDrafts.reduce(
    (acc, line) => ({
      totalGross: acc.totalGross.add(decimal(line.grossSalary)),
      totalTax: acc.totalTax.add(decimal(line.taxAmount)),
      totalEmployerContribution: acc.totalEmployerContribution.add(decimal(line.employerContribution)),
      totalNet: acc.totalNet.add(decimal(line.netSalary)),
    }),
    {
      totalGross: decimal(0),
      totalTax: decimal(0),
      totalEmployerContribution: decimal(0),
      totalNet: decimal(0),
    },
  );

  const payrollRun = await prisma.payrollRun.create({
    data: {
      companyId: input.companyId,
      title: input.title,
      periodStart: startOfDay(input.periodStart),
      periodEnd: endOfDay(input.periodEnd),
      status: input.markPaid ? "PAID" : "FINALIZED",
      totalGross: roundMoney(totals.totalGross),
      totalTax: roundMoney(totals.totalTax),
      totalEmployerContribution: roundMoney(totals.totalEmployerContribution),
      totalNet: roundMoney(totals.totalNet),
      finalizedAt: addDays(input.periodEnd, 1),
    },
  });

  for (const line of lineDrafts) {
    const payrollLine = await prisma.payrollLine.create({
      data: {
        companyId: input.companyId,
        payrollRunId: payrollRun.id,
        userId: line.employee.id,
        hoursWorked: line.workedHours,
        grossSalary: line.grossSalary,
        employerContribution: line.employerContribution,
        taxAmount: line.taxAmount,
        netSalary: line.netSalary,
        absenceHours: line.absenceHours,
        absenceAdjustmentAmount: line.absenceAdjustmentAmount,
        benefitsAmount: line.benefitsAmount,
        taxableBenefitsAmount: line.benefitsAmount,
        taxableGrossAmount: roundMoney(decimal(line.grossSalary)),
        payoutReference: line.payoutReference,
        paymentStatus: line.paymentStatus as "UNPAID" | "PAYMENT_FILE_READY" | "PAID",
        paidAt: line.paidAt,
      },
    });

    for (const timeEntryId of line.timeEntryIds) {
      await prisma.payrollLineTimeEntry.create({
        data: {
          payrollLineId: payrollLine.id,
          timeEntryId,
        },
      });
    }
  }

  const payrollJournal = await createPayrollJournalEntry({
    companyId: input.companyId,
    payrollRunId: payrollRun.id,
    title: payrollRun.title,
    date: endOfDay(input.periodEnd),
    totalGross: payrollRun.totalGross,
    totalTax: payrollRun.totalTax,
    totalEmployerContribution: payrollRun.totalEmployerContribution,
    totalNet: payrollRun.totalNet,
  });

  await prisma.payrollRun.update({
    where: { id: payrollRun.id },
    data: {
      journalEntryId: payrollJournal.id,
    },
  });

  return prisma.payrollRun.findUniqueOrThrow({
    where: { id: payrollRun.id },
    include: { lines: true },
  });
}

export async function runDemoSeed() {
  await resetDatabase();

  const group = await prisma.businessGroup.create({
    data: {
      name: "Joni Group",
      slug: "joni-group",
    },
  });

  const holding = await createCompany({
    name: "Joni Group Holding AB",
    organizationNumber: "556900-1001",
    groupId: group.id,
    companyType: CompanyType.HOLDING,
    isHoldingCompany: true,
    starterSetupNote: "Holdingbolag med gemensam styrning, backoffice och gruppadministration.",
    bankIban: "SE3550000000054910000003",
    bankBic: "ESSESESS",
  });
  const nordisk = await createCompany({
    name: "Nordisk El & Drift AB",
    organizationNumber: "556900-1002",
    groupId: group.id,
    parentCompanyId: holding.id,
    companyType: CompanyType.SUBSIDIARY,
    starterSetupNote: "Projektbaserad el- och driftverksamhet med falthantering och materialfloden.",
  });
  const cleanFlow = await createCompany({
    name: "Clean Flow Facility AB",
    organizationNumber: "556900-1003",
    groupId: group.id,
    companyType: CompanyType.OPERATING,
    starterSetupNote: "Aterkommande serviceuppdrag med hog personaltathet och tydliga lonerutiner.",
  });
  const legalEdge = await createCompany({
    name: "LegalEdge Consulting AB",
    organizationNumber: "556900-1004",
    groupId: group.id,
    companyType: CompanyType.OPERATING,
    starterSetupNote: "Tidsbaserad konsult- och juridikverksamhet med dokumenttunga leveranser.",
  });
  const byggPartner = await createCompany({
    name: "ByggPartner Entreprenad AB",
    organizationNumber: "556900-1005",
    groupId: group.id,
    companyType: CompanyType.OPERATING,
    starterSetupNote: "Storprojekt med milstolpar, materialtryck och kassaflodsbevakning.",
  });
  const ecom = await createCompany({
    name: "Ecom Support Nordic AB",
    organizationNumber: "556900-1006",
    groupId: group.id,
    parentCompanyId: holding.id,
    companyType: CompanyType.SUBSIDIARY,
    starterSetupNote: "Task- och supporttung verksamhet som visar planering, adoption och intern drift.",
  });

  await createUserWithMemberships({
    email: "owner@jonigroup.demo",
    name: "Joni Silander",
    companyId: holding.id,
    role: UserRole.OWNER,
    salaryType: SalaryType.MONTHLY,
    monthlySalary: 78000,
    memberships: [
      { companyId: holding.id, role: UserRole.OWNER },
      { companyId: nordisk.id, role: UserRole.OWNER },
      { companyId: ecom.id, role: UserRole.ADMIN },
    ],
  });

  const groupAdmin = await createUserWithMemberships({
    email: "group.admin@jonigroup.demo",
    name: "Maja Forsberg",
    companyId: holding.id,
    role: UserRole.ADMIN,
    salaryType: SalaryType.MONTHLY,
    monthlySalary: 56000,
    memberships: [
      { companyId: holding.id, role: UserRole.ADMIN },
      { companyId: nordisk.id, role: UserRole.ADMIN },
      { companyId: ecom.id, role: UserRole.ADMIN },
    ],
  });

  const backofficeUsers = {
    anna: await createUserWithMemberships({
      email: "anna.ekstrom@backoffice.demo",
      name: "Anna Ekstrom",
      companyId: holding.id,
      role: UserRole.ADMIN,
      salaryType: SalaryType.MONTHLY,
      monthlySalary: 52000,
      backofficeRoles: [BackofficeRole.BACKOFFICE_ACCOUNTANT],
    }),
    markus: await createUserWithMemberships({
      email: "markus.holm@backoffice.demo",
      name: "Markus Holm",
      companyId: holding.id,
      role: UserRole.ADMIN,
      salaryType: SalaryType.MONTHLY,
      monthlySalary: 61000,
      backofficeRoles: [BackofficeRole.BACKOFFICE_ACCOUNTANT],
    }),
    sofia: await createUserWithMemberships({
      email: "sofia.lindberg@backoffice.demo",
      name: "Sofia Lindberg",
      companyId: holding.id,
      role: UserRole.ADMIN,
      salaryType: SalaryType.MONTHLY,
      monthlySalary: 65000,
      backofficeRoles: [BackofficeRole.BACKOFFICE_AUDITOR],
    }),
    erik: await createUserWithMemberships({
      email: "erik.sand@backoffice.demo",
      name: "Erik Sand",
      companyId: holding.id,
      role: UserRole.ADMIN,
      salaryType: SalaryType.MONTHLY,
      monthlySalary: 59000,
      backofficeRoles: [BackofficeRole.BACKOFFICE_LEGAL],
    }),
    lina: await createUserWithMemberships({
      email: "lina.berg@backoffice.demo",
      name: "Lina Berg",
      companyId: holding.id,
      role: UserRole.ADMIN,
      salaryType: SalaryType.MONTHLY,
      monthlySalary: 54000,
      backofficeRoles: [BackofficeRole.BACKOFFICE_ADMIN],
    }),
    johan: await createUserWithMemberships({
      email: "johan.nystrom@backoffice.demo",
      name: "Johan Nystrom",
      companyId: holding.id,
      role: UserRole.ADMIN,
      salaryType: SalaryType.MONTHLY,
      monthlySalary: 50000,
      backofficeRoles: [BackofficeRole.BACKOFFICE_ACCOUNTANT],
    }),
  };

  const companies = {
    nordisk: {
      company: nordisk,
      ...(await createCompanyTeam({
        companyId: nordisk.id,
        companySlug: "nordiskeldrift",
        ownerName: "Maria Sjostrom",
        managerName: "Oskar Lund",
        financeName: "Elin Bergqvist",
        employeeNames: ["Viktor Palm", "Anton Ros", "Mikael Berg", "Hanna Lundin"],
        employeeRoleLabel: "tekniker",
        employeeHourlyRate: 295,
      })),
    },
    cleanFlow: {
      company: cleanFlow,
      ...(await createCompanyTeam({
        companyId: cleanFlow.id,
        companySlug: "cleanflow",
        ownerName: "Frida Nilsson",
        managerName: "Sara Wenner",
        financeName: "Karin Olofsson",
        employeeNames: ["Nina Ali", "Amina Yusuf", "Hanna Persson", "Moa Karlsson", "Tina Salem", "Alina West"],
        employeeRoleLabel: "serviceledare",
        employeeHourlyRate: 215,
      })),
    },
    legalEdge: {
      company: legalEdge,
      ...(await createCompanyTeam({
        companyId: legalEdge.id,
        companySlug: "legaledge",
        ownerName: "Henrik Dahl",
        managerName: "Rebecka Hall",
        financeName: "Louise Smed",
        employeeNames: ["Emma Gard", "Filip Soder", "Klara Ljung"],
        employeeRoleLabel: "jurist",
        employeeHourlyRate: 540,
      })),
    },
    byggPartner: {
      company: byggPartner,
      ...(await createCompanyTeam({
        companyId: byggPartner.id,
        companySlug: "byggpartner",
        ownerName: "Patrik Eklund",
        managerName: "Stefan Norin",
        financeName: "Josefin Bjork",
        employeeNames: ["Joel Boman", "Isak Holm", "Rasmus Hjelm", "Lina Nyberg", "Robin Akesson"],
        employeeRoleLabel: "yrkesarbetare",
        employeeHourlyRate: 315,
      })),
    },
    ecom: {
      company: ecom,
      ...(await createCompanyTeam({
        companyId: ecom.id,
        companySlug: "ecomsupport",
        ownerName: "Daniela Strom",
        managerName: "Carl Nygren",
        financeName: "Petra Vik",
        employeeNames: ["Mika Salo", "Julia Stark", "Felicia Grape", "Noah Ring"],
        employeeRoleLabel: "supportspecialist",
        employeeHourlyRate: 255,
      })),
    },
  } as const;

  await prisma.company.updateMany({
    where: { id: { in: [nordisk.id, cleanFlow.id, legalEdge.id, byggPartner.id, ecom.id] } },
    data: {},
  });

  await prisma.company.update({
    where: { id: holding.id },
    data: {
      workspaceManagerId: groupAdmin.id,
      backofficeOwnerId: backofficeUsers.lina.id,
    },
  });

  for (const context of Object.values(companies)) {
    await prisma.company.update({
      where: { id: context.company.id },
      data: {
        workspaceManagerId: context.manager.id,
        backofficeOwnerId:
          context.company.id === nordisk.id || context.company.id === byggPartner.id
            ? backofficeUsers.markus.id
            : context.company.id === legalEdge.id
              ? backofficeUsers.erik.id
              : context.company.id === ecom.id
                ? backofficeUsers.anna.id
                : backofficeUsers.johan.id,
      },
    });
  }

  const customerSets = {
    nordisk: await createCustomers(nordisk.id, "nordisk", [
      "City Office Park AB",
      "Sodra Logistikcenter AB",
      "Uppsala Lagerhus AB",
      "Kvarnholmen Bostad AB",
      "Metro Fastigheter AB",
      "Haga Kliniken AB",
    ]),
    cleanFlow: await createCustomers(cleanFlow.id, "cleanflow", [
      "Rosenlund Skola",
      "Globens Kontorspark",
      "Kista Science Hub",
      "Lidingo Vardcentral",
      "Solna Trade Center",
    ]),
    legalEdge: await createCustomers(legalEdge.id, "legaledge", [
      "Nordic Capital Advisory AB",
      "Svea Pharma AB",
      "Atlas Tech Holding AB",
      "Green Harbor Fastigheter AB",
      "Lumen Retail AB",
    ]),
    byggPartner: await createCustomers(byggPartner.id, "byggpartner", [
      "Malarhojden Bostad AB",
      "Signalfabriken Kontor AB",
      "East Port Logistics AB",
      "Akalla Industripark AB",
      "Vasterbron Fastigheter AB",
    ]),
    ecom: await createCustomers(ecom.id, "ecom", [
      "NorthCart Commerce AB",
      "Marketlane Nordic AB",
      "Peak Retail Support AB",
      "OmniFulfilment AB",
      "Bridge Commerce Group AB",
    ]),
  };

  const projectBlueprints = [
    {
      key: "nordisk" as const,
      items: [
        ["Kontorsomdragning Stureplan", "Komplett omdragning av el i kontorsplan.", "ACTIVE", 280000, "Stockholm", ["Sitebesok", "Materialbestallning", "Installation", "Slutkontroll"]],
        ["Lagerunderhall Vasteras", "Lopande underhall av lagerfastighet med jourinslag.", "ACTIVE", 145000, "Vasteras", ["Servicebesok", "Jourberedskap", "Rapportering"]],
        ["Akutfelsokning Solna", "Akuta driftstopp och felsokningar for kommersiell kund.", "COMPLETED", 82000, "Solna", ["Felsokning", "Atgard", "Slutrapport"]],
        ["Serviceavtal Haga Kliniken", "Aterkommande service och batteribyten.", "PLANNED", 96000, "Stockholm", ["Planering", "Bokning", "Genomforande"]],
      ],
    },
    {
      key: "cleanFlow" as const,
      items: [
        ["Rosenlund skolschema VT26", "Aterkommande skolstadning med franvarohantering.", "ACTIVE", 220000, "Stockholm", ["Veckoplanering", "Bemanning", "Kvalitetskontroll"]],
        ["Globens kvallsstading", "Kontorsstadning tre kvallar i veckan.", "ACTIVE", 118000, "Stockholm", ["Schema", "Utforsel", "Avvikelsehantering"]],
        ["Kista extra sanering", "Tillfallig saneringsinsats efter sen kundstart.", "ON_HOLD", 54000, "Kista", ["Kundsamordning", "Resursplan", "Utforsel"]],
        ["Solna Trade Center reception", "Daglig drift av reception och allmanna ytor.", "COMPLETED", 168000, "Solna", ["Bemanningspass", "Kvalitetsrond", "Fakturaunderlag"]],
      ],
    },
    {
      key: "legalEdge" as const,
      items: [
        ["Avtalsgranskning Atlas Tech", "Genomgang av ramavtal och leveransbilagor.", "ACTIVE", 195000, "Stockholm", ["Dokumentinsamling", "Analys", "Redline", "Kundmote"]],
        ["Omstrukturering Green Harbor", "Bolags- och avtalsstod vid koncernjustering.", "ACTIVE", 320000, "Stockholm", ["Forstudie", "Styrelsedokument", "Implementering"]],
        ["Compliance review Lumen", "Intern kontrollgenomgang och riskworkshops.", "COMPLETED", 145000, "Stockholm", ["Intervjuer", "Gap-analys", "Slutmemo"]],
        ["Pharma policy refresh", "Uppdatering av policyramverk.", "PLANNED", 88000, "Uppsala", ["Planering", "Dokumentlista", "Workshop"]],
      ],
    },
    {
      key: "byggPartner" as const,
      items: [
        ["Renovering Malarhojden", "Storre ombyggnation med etappfakturering.", "ACTIVE", 1480000, "Stockholm", ["Etablering", "Rivning", "Byggnation", "KMA-uppfoljning"]],
        ["Office fit-out Signalfabriken", "Kontorsanpassning med fast pris och andringsjobb.", "ACTIVE", 860000, "Sundbyberg", ["Planering", "Installation", "Avvikelsehantering"]],
        ["Logistikterminal East Port", "Milstolpsprojekt med forsening i materialleverans.", "ON_HOLD", 1240000, "Norrkoping", ["Materialstyrning", "Milstolpe 1", "Milstolpe 2"]],
        ["Industripark servicehall", "Mindre entreprenad med slutskede kvar.", "COMPLETED", 420000, "Stockholm", ["Byggmote", "Utforsel", "Slutdokumentation"]],
      ],
    },
    {
      key: "ecom" as const,
      items: [
        ["NorthCart support operation", "Lopande support och SLA-styrd drift.", "ACTIVE", 210000, "Remote", ["Prioritering", "Supportko", "Rapportering"]],
        ["Marketlane onboarding", "Onboarding av ny kunds supportprocess.", "ACTIVE", 128000, "Remote", ["Workshop", "Processuppsattning", "Overlamning"]],
        ["OmniFulfilment reporting setup", "Rapportpaket och intern dashboard.", "COMPLETED", 98000, "Remote", ["Datakallor", "Dashboards", "Validering"]],
        ["Bridge Commerce shift planning", "Resursplanering och intern driftforbattring.", "PLANNED", 76000, "Remote", ["Planering", "Testkora", "Lansering"]],
      ],
    },
  ];

  const contexts: Record<string, CompanySeedContext> = {};

  for (const blueprint of projectBlueprints) {
    const companyContext = companies[blueprint.key];
    const customers = customerSets[blueprint.key];
    contexts[blueprint.key] = {
      company: companyContext.company,
      owner: companyContext.owner,
      manager: companyContext.manager,
      finance: companyContext.finance,
      employees: companyContext.employees,
      customers: customers.map((customer) => ({ id: customer.id, name: customer.name })),
      projects: [],
    };

    for (const [index, rawItem] of blueprint.items.entries()) {
      const item = rawItem as [string, string, ProjectStatus, number, string, string[]];
      const customer = customers[index % customers.length];
      const project = await createQuoteAndProject({
        companyId: companyContext.company.id,
        customer,
        title: item[0],
        description: item[1],
        status: item[2],
        budgetNet: item[3],
        location: item[4],
        startOffset: -55 + index * 7,
        endOffset: index === 3 ? 25 : 10 + index * 10,
      });

      const assignedUsers =
        blueprint.key === "legalEdge"
          ? [companyContext.manager, companyContext.employees[0], companyContext.employees[1] ?? companyContext.finance]
          : [companyContext.manager, ...companyContext.employees.slice(0, 3)];

      const activity = await seedProjectActivity({
        companyId: companyContext.company.id,
        project: project as { id: string; title: string; customerName: string; status: ProjectStatus },
        assignedUsers,
        taskTitles: item[5],
        baseHourlyRate:
          blueprint.key === "legalEdge"
            ? 1650
            : blueprint.key === "byggPartner"
              ? 1180
              : blueprint.key === "nordisk"
                ? 1120
                : blueprint.key === "cleanFlow"
                  ? 620
                  : 860,
        timePattern: [
          { dayOffset: -42 + index * 2, userIndex: 0, hours: 6, taskIndex: 0, note: "Planering och kundkoordinering" },
          { dayOffset: -38 + index * 2, userIndex: 1, hours: 7.5, taskIndex: 1, note: "Genomforande enligt plan" },
          { dayOffset: -31 + index * 2, userIndex: 2, hours: 8, taskIndex: 1, note: "Arbete pa plats" },
          { dayOffset: -24 + index * 2, userIndex: 0, hours: 5.5, taskIndex: 2, note: "Uppfoljning med kund" },
          { dayOffset: -16 + index * 2, userIndex: 1, hours: 7, taskIndex: Math.min(2, item[5].length - 1), note: "Kvalitet och kontroll" },
          { dayOffset: -8 + index * 2, userIndex: 2, hours: 6.5, taskIndex: Math.min(2, item[5].length - 1), note: "Slutforberedelser" },
        ],
        materialPattern:
          blueprint.key === "legalEdge" || blueprint.key === "ecom"
            ? []
            : [
                {
                  dayOffset: -35 + index * 2,
                  userIndex: 0,
                  description: `${item[0]} - materialleverans`,
                  quantity: 1 + index,
                  unitCost: blueprint.key === "byggPartner" ? 18500 : 3200,
                  unitPrice: blueprint.key === "byggPartner" ? 26500 : 5400,
                  supplierName: blueprint.key === "byggPartner" ? "Bygggrossen Sverige AB" : "Nordtek Lager AB",
                },
                {
                  dayOffset: -15 + index * 2,
                  userIndex: 1,
                  description: `${item[0]} - forbrukning`,
                  quantity: 2,
                  unitCost: blueprint.key === "byggPartner" ? 4200 : 850,
                  unitPrice: blueprint.key === "byggPartner" ? 6900 : 1450,
                  supplierName: blueprint.key === "byggPartner" ? "Proffsbygg Material AB" : "Driftskruv AB",
                },
              ],
      });

      contexts[blueprint.key].projects.push({
        id: project.id,
        title: project.title,
        customerId: customer.id,
        customerName: customer.name,
        timeEntries: activity.timeEntries.map((entry) => entry.id),
        materialEntries: activity.materialEntries.map((entry) => entry.id),
        invoices: [],
      });
    }
  }

  const invoicePlans = [
    ["nordisk", 0, "SENT", InvoiceMode.MANUAL_PROGRESS, 3, 1, 0],
    ["nordisk", 0, "PAID", InvoiceMode.PERIODIC, 2, 0, 15000],
    ["nordisk", 1, "PARTIALLY_PAID", InvoiceMode.PERIODIC, 3, 1, 8000],
    ["nordisk", 2, "PAID", InvoiceMode.PROJECT_FINAL, 4, 2, 28000],
    ["nordisk", 3, "DRAFT", InvoiceMode.PROJECT_FINAL, 1, 0, 0],
    ["cleanFlow", 0, "PAID", InvoiceMode.PERIODIC, 3, 0, 18500],
    ["cleanFlow", 0, "SENT", InvoiceMode.PERIODIC, 2, 0, 0],
    ["cleanFlow", 1, "PAID", InvoiceMode.PERIODIC, 2, 0, 12400],
    ["cleanFlow", 2, "OVERDUE", InvoiceMode.PERIODIC, 2, 0, 0],
    ["cleanFlow", 3, "PAID", InvoiceMode.PROJECT_FINAL, 4, 0, 21400],
    ["legalEdge", 0, "SENT", InvoiceMode.MANUAL_PROGRESS, 3, 0, 0],
    ["legalEdge", 0, "PAID", InvoiceMode.PERIODIC, 2, 0, 39000],
    ["legalEdge", 1, "PARTIALLY_PAID", InvoiceMode.PERIODIC, 3, 0, 26000],
    ["legalEdge", 2, "PAID", InvoiceMode.PROJECT_FINAL, 4, 0, 48000],
    ["legalEdge", 3, "DRAFT", InvoiceMode.PROJECT_FINAL, 1, 0, 0],
    ["byggPartner", 0, "PARTIALLY_PAID", InvoiceMode.MANUAL_PROGRESS, 3, 1, 95000],
    ["byggPartner", 0, "SENT", InvoiceMode.MANUAL_PROGRESS, 2, 1, 0],
    ["byggPartner", 1, "PAID", InvoiceMode.PERIODIC, 3, 1, 125000],
    ["byggPartner", 2, "OVERDUE", InvoiceMode.PERIODIC, 2, 1, 0],
    ["byggPartner", 3, "PAID", InvoiceMode.PROJECT_FINAL, 4, 2, 56000],
    ["ecom", 0, "PAID", InvoiceMode.PERIODIC, 3, 0, 18500],
    ["ecom", 1, "SENT", InvoiceMode.PERIODIC, 2, 0, 0],
    ["ecom", 2, "PAID", InvoiceMode.PROJECT_FINAL, 4, 0, 22000],
    ["ecom", 3, "DRAFT", InvoiceMode.PROJECT_FINAL, 1, 0, 0],
  ] as const;

  let invoiceSequence = 1;
  const createdInvoices: string[] = [];
  for (const plan of invoicePlans) {
    const companyContext = contexts[plan[0]];
    const project = companyContext.projects[plan[1]];
    const timeEntries = await prisma.timeEntry.findMany({
      where: { id: { in: project.timeEntries.slice(0, plan[4]) } },
      orderBy: { date: "asc" },
    });
    const materials = await prisma.materialEntry.findMany({
      where: { id: { in: project.materialEntries.slice(0, plan[5]) } },
      orderBy: { createdAt: "asc" },
    });
    const issueDate = addDays(TODAY, -40 + invoiceSequence * 2);
    const dueDate = addDays(issueDate, 30);

    const invoice = await createInvoiceWithLines({
      companyId: companyContext.company.id,
      projectId: project.id,
      customerId: project.customerId,
      customerName: project.customerName,
      invoiceNumber: buildInvoiceNumber(2026, invoiceSequence),
      invoiceMode: plan[3],
      status: plan[2] === "OVERDUE" ? InvoiceStatus.SENT : (plan[2] as InvoiceStatus),
      issueDate,
      dueDate: plan[2] === "OVERDUE" ? addDays(TODAY, -8) : dueDate,
      billingPeriodStart: addDays(issueDate, -14),
      billingPeriodEnd: issueDate,
      lines: [
        ...timeEntries.map((entry, index) => ({
          type: "TIME" as const,
          entryId: entry.id,
          description: `${project.title} - arbetstid ${index + 1}`,
          quantity: 4 + (index % 2) * 2,
          unitPrice: Number(entry.hourlyRate ?? 900),
        })),
        ...materials.map((entry) => ({
          type: "MATERIAL" as const,
          entryId: entry.id,
          description: entry.description,
          quantity: Number(entry.quantity),
          unitPrice: Number(entry.unitPrice),
        })),
      ],
    });

    project.invoices.push(invoice.id);
    createdInvoices.push(invoice.id);
    invoiceSequence += 1;

    if (plan[6] > 0) {
      await registerInvoicePayment({
        companyId: companyContext.company.id,
        invoiceId: invoice.id,
        amount: plan[6],
        date: addDays(issueDate, 12),
        reference: `BET-${invoice.invoiceNumber}`,
      });
    }
  }

  const absenceSeeds = [
    { companyId: nordisk.id, userId: companies.nordisk.employees[0].id, type: "SICK", days: 2, offset: -45, note: "Korttidssjukskrivning i februari." },
    { companyId: cleanFlow.id, userId: companies.cleanFlow.employees[1].id, type: "VAB", days: 1, offset: -22, note: "VAB under sportlovsveckan." },
    { companyId: ecom.id, userId: companies.ecom.employees[2].id, type: "UNPAID_LEAVE", days: 1, offset: -18, note: "Obetald ledighet for privat arende." },
    { companyId: cleanFlow.id, userId: companies.cleanFlow.employees[4].id, type: "VACATION", days: 2, offset: -10, note: "Planerad semester." },
  ] as const;

  for (const seed of absenceSeeds) {
    await prisma.absenceEntry.create({
      data: {
        companyId: seed.companyId,
        userId: seed.userId,
        type: seed.type,
        startDate: startOfDay(addDays(TODAY, seed.offset)),
        endDate: endOfDay(addDays(TODAY, seed.offset + seed.days - 1)),
        quantityDays: roundMoney(seed.days),
        note: seed.note,
        status: "APPROVED",
      },
    });
  }

  await prisma.benefitEntry.createMany({
    data: [
      {
        companyId: nordisk.id,
        userId: companies.nordisk.manager.id,
        type: "CAR",
        description: "Tjanstebil mars",
        taxableAmount: roundMoney(3400),
        status: "APPROVED",
        date: addDays(TODAY, -20),
      },
      {
        companyId: ecom.id,
        userId: companies.ecom.employees[0].id,
        type: "MEAL",
        description: "Maltidsforman under kickoff",
        taxableAmount: roundMoney(620),
        status: "APPROVED",
        date: addDays(TODAY, -16),
      },
    ],
  });

  const payrollRuns = [
    await createPayrollRunFromUsers({
      companyId: nordisk.id,
      title: "Lon 2026-01-01-2026-01-31",
      periodStart: new Date("2026-01-01T00:00:00+01:00"),
      periodEnd: new Date("2026-01-31T00:00:00+01:00"),
      employees: [companies.nordisk.manager, ...companies.nordisk.employees.slice(0, 3)].map((user) => ({
        id: user.id,
        salaryType: user.id === companies.nordisk.manager.id ? SalaryType.MONTHLY : SalaryType.HOURLY,
        hourlyRate: user.id === companies.nordisk.manager.id ? null : 295,
        monthlySalary: user.id === companies.nordisk.manager.id ? 43000 : null,
      })),
      markPaid: true,
    }),
    await createPayrollRunFromUsers({
      companyId: nordisk.id,
      title: "Lon 2026-02-01-2026-02-28",
      periodStart: new Date("2026-02-01T00:00:00+01:00"),
      periodEnd: new Date("2026-02-28T00:00:00+01:00"),
      employees: [companies.nordisk.manager, ...companies.nordisk.employees.slice(0, 3)].map((user) => ({
        id: user.id,
        salaryType: user.id === companies.nordisk.manager.id ? SalaryType.MONTHLY : SalaryType.HOURLY,
        hourlyRate: user.id === companies.nordisk.manager.id ? null : 295,
        monthlySalary: user.id === companies.nordisk.manager.id ? 43000 : null,
      })),
      paymentReady: true,
    }),
    await createPayrollRunFromUsers({
      companyId: cleanFlow.id,
      title: "Lon 2026-02-01-2026-02-28",
      periodStart: new Date("2026-02-01T00:00:00+01:00"),
      periodEnd: new Date("2026-02-28T00:00:00+01:00"),
      employees: companies.cleanFlow.employees.slice(0, 5).map((user) => ({
        id: user.id,
        salaryType: SalaryType.HOURLY,
        hourlyRate: 215,
        monthlySalary: null,
      })),
      markPaid: true,
    }),
    await createPayrollRunFromUsers({
      companyId: ecom.id,
      title: "Lon 2026-02-01-2026-02-28",
      periodStart: new Date("2026-02-01T00:00:00+01:00"),
      periodEnd: new Date("2026-02-28T00:00:00+01:00"),
      employees: [companies.ecom.manager, ...companies.ecom.employees.slice(0, 3)].map((user) => ({
        id: user.id,
        salaryType: user.id === companies.ecom.manager.id ? SalaryType.MONTHLY : SalaryType.HOURLY,
        hourlyRate: user.id === companies.ecom.manager.id ? null : 255,
        monthlySalary: user.id === companies.ecom.manager.id ? 43000 : null,
      })),
      markPaid: true,
    }),
    await createPayrollRunFromUsers({
      companyId: cleanFlow.id,
      title: "Lon 2026-03-01-2026-03-31",
      periodStart: new Date("2026-03-01T00:00:00+01:00"),
      periodEnd: new Date("2026-03-31T00:00:00+02:00"),
      employees: companies.cleanFlow.employees.slice(0, 5).map((user) => ({
        id: user.id,
        salaryType: SalaryType.HOURLY,
        hourlyRate: 215,
        monthlySalary: null,
      })),
      paymentReady: true,
    }),
  ];

  for (const payrollRun of payrollRuns.slice(0, 4)) {
    await createEmployerDeclarationRun({
      companyId: payrollRun.companyId,
      periodStart: payrollRun.periodStart,
      periodEnd: payrollRun.periodEnd,
      status: payrollRun.status === "PAID" ? "SUBMITTED" : "READY",
      payrollRuns: payrollRun.lines.map((line) => ({
        payrollRunId: payrollRun.id,
        payrollLineId: line.id,
        userId: line.userId,
        grossSalary: line.grossSalary,
        taxAmount: line.taxAmount,
        employerContribution: line.employerContribution,
        benefitsAmount: line.benefitsAmount,
        absenceAdjustmentAmount: line.absenceAdjustmentAmount,
      })),
    });
  }

  const vatCandidates = await prisma.journalEntry.findMany({
    where: {
      sourceType: { in: ["INVOICE", "MATERIAL", "CUSTOMER_PAYMENT", "PAYROLL"] },
    },
    orderBy: { date: "asc" },
  });
  await createVatReportRun({
    companyId: nordisk.id,
    periodStart: new Date("2026-01-01T00:00:00+01:00"),
    periodEnd: new Date("2026-01-31T23:59:59+01:00"),
    status: "FILED",
    outputVat25: 16420,
    inputVat: 2860,
    linkedJournalEntryIds: vatCandidates.filter((entry) => entry.companyId === nordisk.id).slice(0, 4).map((entry) => entry.id),
    filedAt: addDays(TODAY, -40),
  });
  await createVatReportRun({
    companyId: cleanFlow.id,
    periodStart: new Date("2026-02-01T00:00:00+01:00"),
    periodEnd: new Date("2026-02-28T23:59:59+01:00"),
    status: "READY",
    outputVat25: 11840,
    inputVat: 1540,
    linkedJournalEntryIds: vatCandidates.filter((entry) => entry.companyId === cleanFlow.id).slice(0, 3).map((entry) => entry.id),
  });
  await createVatReportRun({
    companyId: byggPartner.id,
    periodStart: new Date("2026-02-01T00:00:00+01:00"),
    periodEnd: new Date("2026-02-28T23:59:59+01:00"),
    status: "DRAFT",
    outputVat25: 48200,
    inputVat: 21250,
    linkedJournalEntryIds: vatCandidates.filter((entry) => entry.companyId === byggPartner.id).slice(0, 4).map((entry) => entry.id),
  });

  await createAdoptionFollowUp({
    companyId: nordisk.id,
    ownerId: companies.nordisk.manager.id,
    title: "Folj upp delfakturering efter lagerunderhall",
    description: "Projektet har bra aktivitet men saknar sista periodfakturan.",
    status: CompanyAdoptionFollowUpStatus.IN_PROGRESS,
    reviewStatus: CompanyAdoptionFollowUpReviewStatus.REVIEW_NEEDED,
    outcomeStatus: CompanyAdoptionFollowUpOutcomeStatus.PARTIAL_IMPROVEMENT,
    dueDate: addDays(TODAY, 4),
    reviewByDate: addDays(TODAY, 2),
    lastReviewedAt: addDays(TODAY, -5),
    lastReviewedByUserId: backofficeUsers.anna.id,
    outcomeRecordedAt: addDays(TODAY, -6),
    outcomeRecordedByUserId: backofficeUsers.anna.id,
  });
  await createAdoptionFollowUp({
    companyId: cleanFlow.id,
    ownerId: companies.cleanFlow.finance.id,
    title: "Fa fart pa Kista extra sanering",
    description: "Uppdraget har fastnat och bemanning saknas.",
    status: CompanyAdoptionFollowUpStatus.OPEN,
    reviewStatus: CompanyAdoptionFollowUpReviewStatus.OVERDUE_REVIEW,
    outcomeStatus: CompanyAdoptionFollowUpOutcomeStatus.NO_PROGRESS,
    dueDate: addDays(TODAY, -1),
    reviewByDate: addDays(TODAY, -3),
  });
  await createAdoptionFollowUp({
    companyId: legalEdge.id,
    ownerId: companies.legalEdge.manager.id,
    title: "Styr upp nasta fas efter compliance review",
    status: CompanyAdoptionFollowUpStatus.DONE,
    reviewStatus: CompanyAdoptionFollowUpReviewStatus.REVIEWED_RECENTLY,
    outcomeStatus: CompanyAdoptionFollowUpOutcomeStatus.IMPROVED,
    dueDate: addDays(TODAY, -10),
    reviewByDate: addDays(TODAY, -6),
    lastReviewedAt: addDays(TODAY, -4),
    lastReviewedByUserId: backofficeUsers.erik.id,
    outcomeRecordedAt: addDays(TODAY, -4),
    outcomeRecordedByUserId: backofficeUsers.erik.id,
    outcomeSummary: "Klienten gick fran stillastande till aktiv leverans efter tydlig ansvarssattning.",
  });

  const documentStories = [
    [nordisk.id, backofficeUsers.anna.id, "VAT", "Momsunderlag mars", "Maskinkopior saknas for tva inkop."],
    [nordisk.id, backofficeUsers.markus.id, "ACCOUNTING", "Bankutdrag februari", "Verifierat bankunderlag for lagerunderhall."],
    [cleanFlow.id, backofficeUsers.johan.id, "PAYROLL", "Loneunderlag februari", "Sjukfranvaro och VAB kravde manuell kontroll."],
    [legalEdge.id, backofficeUsers.erik.id, "LEGAL", "Agarstruktur Green Harbor", "Oklar fullmakt pa ett moderbolagsbeslut."],
    [byggPartner.id, backofficeUsers.markus.id, "AUDIT", "Materialavvikelse East Port", "Skillnad mellan leveranssedel och bokfort material."],
    [byggPartner.id, backofficeUsers.anna.id, "VAT", "Momskontroll februari", "Utgaende moms ser rimlig ut men underlag ar ofullstandigt."],
    [ecom.id, backofficeUsers.anna.id, "ACCOUNTING", "Supportfakturor Q1", "Granskning av periodfakturor och kundbetalningar."],
    [ecom.id, backofficeUsers.lina.id, "GENERAL", "Adoption handoff", "Intern anteckning om overlamning och kundhalsa."],
  ] as const;

  const documents = [];
  for (const [companyId, uploadedByUserId, category, title, description] of documentStories) {
    const document = await createBackofficeDocument({
      companyId,
      uploadedByUserId,
      category: category as BackofficeDocumentCategory,
      title,
      description,
      fileName: `${title.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      fileUrl: `/demo/documents/${title.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      documentDate: addDays(TODAY, -12),
      status: title.includes("Bankutdrag") ? BackofficeDocumentStatus.VERIFIED : BackofficeDocumentStatus.RECEIVED,
      verifiedByUserId: title.includes("Bankutdrag") ? backofficeUsers.anna.id : null,
      verifiedAt: title.includes("Bankutdrag") ? addDays(TODAY, -8) : null,
    });
    documents.push(document);
  }

  const workingPapers = [
    await createWorkingPaper({
      companyId: nordisk.id,
      category: WorkingPaperCategory.VAT,
      title: "PM - saknade momsunderlag mars",
      description: "Identifiera saknade kvitton och bedom om inkop kan verifieras via orderflode.",
      status: WorkingPaperStatus.IN_PROGRESS,
      assignedToUserId: backofficeUsers.anna.id,
      relatedDocumentId: documents[0].id,
    }),
    await createWorkingPaper({
      companyId: cleanFlow.id,
      category: WorkingPaperCategory.PAYROLL,
      title: "Loneavvikelse - VAB och sjukfranvaro",
      description: "Kontrollera att avdrag och sjuktid foljer intern policy i seedscenariot.",
      status: WorkingPaperStatus.REVIEWED,
      assignedToUserId: backofficeUsers.johan.id,
      relatedDocumentId: documents[2].id,
    }),
    await createWorkingPaper({
      companyId: legalEdge.id,
      category: WorkingPaperCategory.LEGAL,
      title: "Intern PM - fullmaktskontroll",
      description: "Sammanfatta oklarheter i bolagsstruktur och behov av komplettering.",
      status: WorkingPaperStatus.OPEN,
      assignedToUserId: backofficeUsers.erik.id,
      relatedDocumentId: documents[3].id,
    }),
    await createWorkingPaper({
      companyId: byggPartner.id,
      category: WorkingPaperCategory.AUDIT,
      title: "Milstolpsavvikelse East Port",
      description: "Knyt leveranssedlar och fakturerade materialposter till projektets milstolpar.",
      status: WorkingPaperStatus.IN_PROGRESS,
      assignedToUserId: backofficeUsers.sofia.id,
      relatedDocumentId: documents[4].id,
    }),
    await createWorkingPaper({
      companyId: ecom.id,
      category: WorkingPaperCategory.ACCOUNTING,
      title: "Periodfakturor och kundbetalningar",
      description: "Snabbgenomgang av forfallna supportfakturor och matchade betalningar.",
      status: WorkingPaperStatus.FINAL,
      assignedToUserId: backofficeUsers.markus.id,
      relatedDocumentId: documents[6].id,
    }),
  ];

  for (const workingPaper of workingPapers) {
    await createBackofficeNote({
      userId: workingPaper.assignedToUserId ?? backofficeUsers.lina.id,
      workingPaperId: workingPaper.id,
      content: "Internt arbetsunderlag uppdaterat for demo och uppfoljning.",
    });
  }

  const casePackDefinitions = [
    [nordisk.id, "VAT", "VAT Mars 2026 - Nordisk", "OPEN", [documents[0].id], [workingPapers[0].id]],
    [nordisk.id, "ACCOUNTING", "Bokforingsgranskning februari", "IN_PROGRESS", [documents[1].id], []],
    [cleanFlow.id, "PAYROLL", "Payroll Februari 2026", "REVIEWED", [documents[2].id], [workingPapers[1].id]],
    [legalEdge.id, "LEGAL", "Agar- och fullmaktsfraga", "OPEN", [documents[3].id], [workingPapers[2].id]],
    [byggPartner.id, "AUDIT", "East Port - bokslutsberedning", "IN_PROGRESS", [documents[4].id], [workingPapers[3].id]],
    [byggPartner.id, "VAT", "VAT Februari 2026 - ByggPartner", "OPEN", [documents[5].id], []],
    [ecom.id, "ACCOUNTING", "Supportfakturor Q1", "FINAL", [documents[6].id], [workingPapers[4].id]],
    [ecom.id, "GENERAL", "Adoption och overlamning", "IN_PROGRESS", [documents[7].id], []],
    [legalEdge.id, "AUDIT", "Year-end prep LegalEdge", "REVIEWED", [], []],
    [cleanFlow.id, "ACCOUNTING", "Kista sanering - ofullstandigt underlag", "OPEN", [], []],
    [nordisk.id, "PAYROLL", "Lon februari - tekniker", "REVIEWED", [], []],
    [byggPartner.id, "ACCOUNTING", "Forfallna projektfakturor", "IN_PROGRESS", [], []],
    [holding.id, "LEGAL", "Koncernstruktur och roller", "OPEN", [], []],
    [holding.id, "AUDIT", "Holding year-end prep", "FINAL", [], []],
    [ecom.id, "PAYROLL", "Payroll mars 2026", "IN_PROGRESS", [], []],
  ] as const;

  for (const [companyId, category, title, status, documentIds, workingPaperIds] of casePackDefinitions) {
    const ownerId =
      category === "LEGAL"
        ? backofficeUsers.erik.id
        : category === "PAYROLL"
          ? backofficeUsers.johan.id
          : category === "AUDIT"
            ? backofficeUsers.sofia.id
            : backofficeUsers.anna.id;

    await createCasePack({
      companyId,
      category: category as BackofficeCasePackCategory,
      title,
      description: "Demo-pack med tydliga underlag, arbetsunderlag och readiness-signaler.",
      periodStart: addDays(TODAY, -35),
      periodEnd: addDays(TODAY, -5),
      status: status as BackofficeCasePackStatus,
      assignedToUserId: ownerId,
      createdByUserId: backofficeUsers.lina.id,
      documentIds: [...documentIds],
      workingPaperIds: [...workingPaperIds],
      notes: [{ userId: ownerId, content: "Pack byggt for demo med realistisk processhistoria." }],
      checklistItems: [
        {
          title: "Underlag mottaget",
          itemType: BackofficeCasePackChecklistItemType.REQUIRED_EVIDENCE,
          status: documentIds.length ? "DONE" : "OPEN",
          requiredDocumentCategory:
            category === "VAT"
              ? "VAT"
              : category === "PAYROLL"
                ? "PAYROLL"
                : category === "LEGAL"
                  ? "LEGAL"
                  : "ACCOUNTING",
          requiredVerifiedDocument: category === "ACCOUNTING" || category === "VAT",
          comments: [{ userId: ownerId, content: documentIds.length ? "Relevanta underlag finns i paketet." : "Underlag saknas fortfarande i demo-scenariot." }],
        },
        {
          title: "Kontrollpunkt genomford",
          itemType: BackofficeCasePackChecklistItemType.CONTROL_POINT,
          status: status === "FINAL" || status === "REVIEWED" ? "DONE" : "IN_PROGRESS",
          comments: [{ userId: ownerId, content: "Kontrollpunkt anvands for att visa aktiv intern granskning." }],
        },
        {
          title: "Klar for granskning",
          itemType: BackofficeCasePackChecklistItemType.REVIEW_STEP,
          status: status === "REVIEWED" || status === "FINAL" ? "DONE" : "OPEN",
          comments: [{ userId: ownerId, content: "Reviewsteget star oppet i de pack som fortfarande saknar beslut." }],
        },
        {
          title: "Avvikelse eller blockerare",
          itemType: BackofficeCasePackChecklistItemType.DEVIATION,
          status: title.includes("VAT") || title.includes("ofullstandigt") || title.includes("fullmaktsfraga") ? "BLOCKED" : "NOT_APPLICABLE",
          comments: [{ userId: ownerId, content: "Den här avvikelsen gor readiness-laget enkelt att visa i demo." }],
        },
      ],
    });
  }

  await createBackofficeFollowUp({
    companyId: byggPartner.id,
    assignedToUserId: backofficeUsers.markus.id,
    createdByUserId: backofficeUsers.lina.id,
    category: BackofficeFollowUpCategory.ACCOUNTING,
    title: "Folj upp forfallen delbetalning",
    description: "Stor faktura ar forfallen och ska lyftas i klientmote.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: addDays(TODAY, 2),
  });
  await createBackofficeFollowUp({
    companyId: legalEdge.id,
    assignedToUserId: backofficeUsers.erik.id,
    createdByUserId: backofficeUsers.lina.id,
    category: BackofficeFollowUpCategory.LEGAL,
    title: "Bekrafta fullmakt i Green Harbor",
    description: "Juridisk uppfoljning knuten till legal case pack.",
    status: "OPEN",
    priority: "MEDIUM",
    dueDate: addDays(TODAY, 5),
  });

  await logSeedSummary(`Demo seed complete (password ${DEMO_PASSWORD})`);
}
