import { BankFileExportProfile, Prisma } from "@prisma/client";
import { bankFileExportProfileLabels } from "@/lib/skv-exports";
import { prisma } from "@/lib/prisma";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
}

function compact(value: string) {
  return value.replace(/\s+/g, "");
}

async function getPayrollExportContext(companyId: string, payrollRunId: string) {
  const payrollRun = await prisma.payrollRun.findFirst({
    where: {
      id: payrollRunId,
      companyId,
    },
    include: {
      company: {
        select: {
          name: true,
          organizationNumber: true,
          bankIban: true,
          bankBic: true,
          bankExportProfile: true,
        },
      },
      lines: {
        where: {
          netSalary: {
            gt: 0,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              bankIban: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!payrollRun) {
    throw new Error("Lonekorningen kunde inte hittas.");
  }

  return payrollRun;
}

export async function generatePayrollPain001Xml(companyId: string, payrollRunId: string) {
  const payrollRun = await getPayrollExportContext(companyId, payrollRunId);

  if (!payrollRun.company.bankIban || !payrollRun.company.bankBic) {
    throw new Error("Bolagets IBAN och BIC maste vara satta innan bankfil kan exporteras.");
  }

  const linesMissingIban = payrollRun.lines.filter((line) => !line.user.bankIban);
  if (linesMissingIban.length > 0) {
    throw new Error("Alla medarbetare i utbetalningen maste ha IBAN innan bankfil kan exporteras.");
  }

  const messageId = `PAY-${payrollRun.id}`;
  const creationDate = new Date().toISOString();
  const executionDate = payrollRun.periodEnd.toISOString().slice(0, 10);
  const controlSum = formatAmount(
    payrollRun.lines.reduce((sum, line) => sum.add(line.netSalary), new Prisma.Decimal(0)),
  );

  const transactions = payrollRun.lines
    .map(
      (line, index) => `
        <CdtTrfTxInf>
          <PmtId>
            <EndToEndId>${xmlEscape(line.payoutReference ?? `PAY-${index + 1}`)}</EndToEndId>
          </PmtId>
          <Amt>
            <InstdAmt Ccy="SEK">${formatAmount(line.netSalary)}</InstdAmt>
          </Amt>
          <CdtrAgt>
            <FinInstnId>
              <BICFI>NOTPROVIDED</BICFI>
            </FinInstnId>
          </CdtrAgt>
          <Cdtr>
            <Nm>${xmlEscape(line.user.name)}</Nm>
          </Cdtr>
          <CdtrAcct>
            <Id>
              <IBAN>${xmlEscape(line.user.bankIban ?? "")}</IBAN>
            </Id>
          </CdtrAcct>
          <RmtInf>
            <Ustrd>${xmlEscape(line.payoutReference ?? payrollRun.title)}</Ustrd>
          </RmtInf>
        </CdtTrfTxInf>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${xmlEscape(messageId)}</MsgId>
      <CreDtTm>${xmlEscape(creationDate)}</CreDtTm>
      <NbOfTxs>${payrollRun.lines.length}</NbOfTxs>
      <CtrlSum>${controlSum}</CtrlSum>
      <InitgPty>
        <Nm>${xmlEscape(payrollRun.company.name)}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${xmlEscape(payrollRun.company.organizationNumber)}</Id>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xmlEscape(messageId)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${payrollRun.lines.length}</NbOfTxs>
      <CtrlSum>${controlSum}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${xmlEscape(executionDate)}</ReqdExctnDt>
      <Dbtr>
        <Nm>${xmlEscape(payrollRun.company.name)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${xmlEscape(payrollRun.company.bankIban)}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${xmlEscape(payrollRun.company.bankBic)}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>${transactions}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}

export async function generateBankgirotSalaryFile(companyId: string, payrollRunId: string) {
  const payrollRun = await getPayrollExportContext(companyId, payrollRunId);

  const linesMissingIban = payrollRun.lines.filter((line) => !line.user.bankIban);
  if (linesMissingIban.length > 0) {
    throw new Error("Alla medarbetare i utbetalningen maste ha ett kontonummer/IBAN innan lonfil kan exporteras.");
  }

  const header = [
    "BG-LON",
    compact(payrollRun.company.organizationNumber),
    payrollRun.periodEnd.toISOString().slice(0, 10),
    payrollRun.title,
  ].join(";");

  const detailRows = payrollRun.lines.map((line, index) =>
    [
      index + 1,
      line.user.name,
      compact(line.user.bankIban ?? ""),
      formatAmount(line.netSalary),
      line.payoutReference ?? `LON-${payrollRun.periodEnd.toISOString().slice(0, 10)}`,
    ].join(";"),
  );

  const footer = [
    "SUM",
    payrollRun.lines.length,
    formatAmount(
      payrollRun.lines.reduce((sum, line) => sum.add(line.netSalary), new Prisma.Decimal(0)),
    ),
  ].join(";");

  return [header, ...detailRows, footer].join("\r\n");
}

export async function generatePayrollBankFile(
  companyId: string,
  payrollRunId: string,
  profile?: BankFileExportProfile,
) {
  const payrollRun = await getPayrollExportContext(companyId, payrollRunId);
  const selectedProfile = profile ?? payrollRun.company.bankExportProfile;

  if (selectedProfile === "BANKGIROT_LON") {
    return {
      filename: `payroll-bankgirot-${payrollRunId}.txt`,
      contentType: "text/plain; charset=utf-8",
      profile: selectedProfile,
      profileLabel: bankFileExportProfileLabels[selectedProfile],
      body: await generateBankgirotSalaryFile(companyId, payrollRunId),
    };
  }

  return {
    filename: `payroll-pain001-${payrollRunId}.xml`,
    contentType: "application/xml; charset=utf-8",
    profile: selectedProfile,
    profileLabel: bankFileExportProfileLabels[selectedProfile],
    body: await generatePayrollPain001Xml(companyId, payrollRunId),
  };
}
