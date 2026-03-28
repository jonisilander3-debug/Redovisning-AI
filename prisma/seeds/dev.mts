import {
  DEMO_PASSWORD,
  InvoiceStatus,
  ProjectStatus,
  UserRole,
  addDays,
  atTime,
  buildInvoiceNumber,
  createCompany,
  createInvoiceWithLines,
  createUserWithMemberships,
  logSeedSummary,
  prisma,
  resetDatabase,
  roundMoney,
} from "./shared.mts";

export async function runDevSeed() {
  await resetDatabase();

  const today = new Date("2026-03-28T10:00:00+01:00");
  const company = await createCompany({
    name: "Nordisk Demo Service AB",
    organizationNumber: "556900-1101",
  });

  const owner = await createUserWithMemberships({
    email: "owner@demo.local",
    name: "Demo Owner",
    companyId: company.id,
    role: UserRole.OWNER,
    salaryType: "MONTHLY",
    monthlySalary: 42000,
  });

  await prisma.company.update({
    where: { id: company.id },
    data: {
      workspaceManagerId: owner.id,
    },
  });

  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Demo Fastigheter AB",
      organizationNumber: "556801-2244",
      contactPerson: "Sara Lind",
      email: "sara.lind@demo-fastigheter.se",
      invoiceTermsDays: 30,
      defaultHourlyRate: roundMoney(995),
    },
  });

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      customerId: customer.id,
      customerName: customer.name,
      title: "Kontorsservice april",
      description: "Ett litet utvecklingsprojekt for lokal testdata.",
      status: ProjectStatus.ACTIVE,
      commercialBasisType: "RUNNING_WORK",
      budgetNet: roundMoney(18000),
      budgetGross: roundMoney(22500),
      startDate: addDays(today, -14),
      endDate: addDays(today, 14),
      location: "Stockholm",
    },
  });

  const task = await prisma.task.create({
    data: {
      companyId: company.id,
      projectId: project.id,
      title: "Grundarbete och dokumentation",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      assignedUserId: owner.id,
      dueDate: addDays(today, 5),
    },
  });

  const entryDate = addDays(today, -2);
  const timeEntry = await prisma.timeEntry.create({
    data: {
      companyId: company.id,
      userId: owner.id,
      projectId: project.id,
      taskId: task.id,
      hourlyRate: roundMoney(995),
      isBillable: true,
      date: entryDate,
      startTime: atTime(entryDate, 8, 0),
      endTime: atTime(entryDate, 12, 0),
      status: "COMPLETED",
      note: "Demoarbete for seedmiljo",
    },
  });

  await createInvoiceWithLines({
    companyId: company.id,
    projectId: project.id,
    customerId: customer.id,
    customerName: customer.name,
    invoiceNumber: buildInvoiceNumber(2026, 1),
    status: InvoiceStatus.SENT,
    issueDate: addDays(today, -1),
    dueDate: addDays(today, 29),
    lines: [
      {
        type: "TIME",
        entryId: timeEntry.id,
        description: "Projektarbete och uppstart",
        quantity: 4,
        unitPrice: 995,
      },
    ],
  });

  await logSeedSummary(`Dev seed complete (password ${DEMO_PASSWORD})`);
}
