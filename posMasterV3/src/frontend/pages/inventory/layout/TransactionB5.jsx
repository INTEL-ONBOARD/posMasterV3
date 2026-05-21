import React from "react";

function fmt(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  return Number.isFinite(num)
    ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(value);
}

function formatReportDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}

function renderOfficeUseCell(row, rowIndex) {
  const officeUse = row?.officeUse;

  if (officeUse?.type === "label") {
    return <div style={styles.officeCell}>{officeUse.value || ""}</div>;
  }

  if (officeUse?.type === "center") {
    return <div style={{ ...styles.officeCell, textAlign: "center", verticalAlign: "middle" }}>{officeUse.value || ""}</div>;
  }

  if (rowIndex === 0) return <div style={styles.officeCell}>received date</div>;
  if (rowIndex === 1) return <div style={styles.officeCell}>inspected date</div>;
  if (rowIndex === 2) return <div style={styles.officeCell}>approved date</div>;
  if (rowIndex === 3) return <div style={{ ...styles.officeCell, textAlign: "center", verticalAlign: "middle" }}>After Inspection</div>;

  if (rowIndex >= 4 && rowIndex <= 7) {
    const innerRows = [
      ["", "Less cash", "More cash"],
      ["Date", "", ""],
      ["Previous day", "", ""],
      ["Today", "", ""],
    ];
    const innerIndex = rowIndex - 4;
    const cellData = innerRows[innerIndex];

    return (
      <div style={styles.officeNested}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 4,
            fontWeight: innerIndex === 0 ? 700 : 400,
            fontSize: 11,
          }}
        >
          <div style={{ textAlign: "center" }}>{cellData[0]}</div>
          <div style={{ textAlign: "center" }}>{cellData[1]}</div>
          <div style={{ textAlign: "center" }}>{cellData[2]}</div>
        </div>
      </div>
    );
  }

  return <div style={styles.officeCell} />;
}

function renderMoneyRow(row, key) {
  return fmt(row?.[key]);
}

export default function TransactionB5Rep({
  meta,
  topTable = [],
  receivedRows = [],
  expensesRows = [],
}) {
  const companyName = meta?.companyName || "Sample Cooperative Society";
  const branchName = meta?.branchName || "";
  const reportTitle = meta?.reportTitle || "Sales Report (B5)";
  const reportDate = meta?.reportDate || "";
  const formNo = meta?.formNo || "1120";

  const normalizedTopTable = Array.isArray(topTable) ? topTable : [];
  const normalizedReceivedRows = Array.isArray(receivedRows) ? receivedRows : [];
  const normalizedExpensesRows = Array.isArray(expensesRows) ? expensesRows : [];

  return (
    <div style={{ padding: 12, background: "#f4f6f8", minHeight: "100vh" }}>
      <style>{printStyles}</style>

      <div className="report-page transaction-b5-page" style={styles.page}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.company}>{companyName}</div>
            {branchName ? <div style={styles.branch}>{branchName}</div> : null}
            <div style={styles.reportTitle}>{reportTitle}</div>
          </div>
          <div style={styles.headerRight}>
            <div><strong>Date:</strong> {formatReportDate(reportDate)}</div>
            <div><strong>Form:</strong> {formNo}</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Total Sales</th>
                <th style={styles.th}>BOP</th>
                <th style={styles.th}>Member Credit</th>
                <th style={styles.th}>Staff Credit</th>
                <th style={styles.th}>3 month manure</th>
                <th style={styles.th}>Monthly manure</th>
                <th style={styles.th}>Long-term credit</th>
                <th style={styles.th}>Credit Total</th>
                <th style={styles.th}>Office use only</th>
              </tr>
            </thead>

            <tbody>
              {normalizedTopTable.length === 0 ? (
                <tr>
                  <td style={styles.tdLeft} colSpan={10}>
                    No data available
                  </td>
                </tr>
              ) : (
                normalizedTopTable.map((row, idx) => (
                  <tr key={`row-${idx}`}>
                    <td style={styles.tdLeft}>{row?.description || ""}</td>
                    <td style={styles.td}>{renderMoneyRow(row, "totalSales")}</td>
                    <td style={styles.td}>{renderMoneyRow(row, "bop")}</td>
                    <td style={styles.td}>{renderMoneyRow(row, "memberCredit")}</td>
                    <td style={styles.td}>{renderMoneyRow(row, "staffCredit")}</td>
                    <td style={styles.td}>{renderMoneyRow(row, "threeMonthManure")}</td>
                    <td style={styles.td}>{renderMoneyRow(row, "monthlyManure")}</td>
                    <td style={styles.td}>{renderMoneyRow(row, "longTermCredit")}</td>
                    <td style={styles.td}>{renderMoneyRow(row, "creditTotal")}</td>
                    <td style={{ ...styles.td, padding: 6 }}>
                      {renderOfficeUseCell(row, idx)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <table style={{ ...styles.subTable }}>
            <thead>
              <tr>
                <th colSpan={4} style={styles.subHeader}>Received</th>
              </tr>
              <tr>
                <th style={styles.thSmall}>Prev. day</th>
                <th style={styles.thSmall}>Description</th>
                <th style={styles.thSmall}>Date</th>
                <th style={styles.thSmall}>Today total</th>
              </tr>
            </thead>
            <tbody>
              {normalizedReceivedRows.length === 0 ? (
                <tr>
                  <td style={styles.tdSmall} colSpan={4}>
                    No data available
                  </td>
                </tr>
              ) : (
                normalizedReceivedRows.map((row, i) => (
                  <tr key={`received-${i}`}>
                    <td style={styles.tdSmall}>{fmt(row?.prevDay)}</td>
                    <td style={styles.tdLeftSmall}>{row?.description || ""}</td>
                    <td style={styles.tdSmall}>{row?.date ? formatReportDate(row.date) : ""}</td>
                    <td style={styles.tdSmall}>{fmt(row?.todayTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <table style={{ ...styles.subTable }}>
            <thead>
              <tr>
                <th colSpan={5} style={styles.subHeader}>Expenses</th>
              </tr>
              <tr>
                <th style={styles.thSmall}>Prev. day</th>
                <th style={styles.thSmall}>Invoice (keeper)</th>
                <th style={styles.thSmall}>Description</th>
                <th style={styles.thSmall}>Date</th>
                <th style={styles.thSmall}>Today total</th>
              </tr>
            </thead>
            <tbody>
              {normalizedExpensesRows.length === 0 ? (
                <tr>
                  <td style={styles.tdSmall} colSpan={5}>
                    No data available
                  </td>
                </tr>
              ) : (
                normalizedExpensesRows.map((row, i) => (
                  <tr key={`expense-${i}`}>
                    <td style={styles.tdSmall}>{fmt(row?.prevDay)}</td>
                    {i === 0 ? (
                      <td style={styles.tdSmall} rowSpan={normalizedExpensesRows.length}>
                        <div style={{ fontSize: 12, textAlign: "left", verticalAlign: "top" }}>
                          {row?.invoice || "Invoice number from money keeper"}
                        </div>
                      </td>
                    ) : null}
                    <td style={styles.tdLeftSmall}>{row?.description || ""}</td>
                    <td style={styles.tdSmall}>{row?.date ? formatReportDate(row.date) : ""}</td>
                    <td style={styles.tdSmall}>{fmt(row?.todayTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <div style={styles.footerRight}>
            <div style={styles.sign}><div style={styles.signLine} />Prepared by</div>
            <div style={styles.sign}><div style={styles.signLine} />Authorized by</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#fff",
    padding: 16,
    boxShadow: "0 0 10px rgba(0,0,0,0.08)",
    fontFamily: "Arial, sans-serif",
    fontSize: 12,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: {},
  headerRight: { textAlign: "right", fontSize: 11 },
  company: { fontSize: 14, fontWeight: 700 },
  branch: { fontSize: 12, fontWeight: 600, marginTop: 2 },
  reportTitle: { fontSize: 16, fontWeight: 700, marginTop: 4 },

  table: { width: "100%", borderCollapse: "collapse" },
  th: { border: "1px solid #000", padding: 4, fontWeight: 700, textAlign: "center" },
  td: { border: "1px solid #000", padding: 4, textAlign: "right", verticalAlign: "top" },
  tdLeft: { border: "1px solid #000", padding: 4, textAlign: "left", verticalAlign: "top" },

  officeCell: { minHeight: 22, fontSize: 11 },
  officeNested: { width: "100%" },

  subTable: { width: "50%", borderCollapse: "collapse" },
  subHeader: { border: "1px solid #000", padding: 6, textAlign: "center", fontWeight: 700 },
  thSmall: { border: "1px solid #000", padding: 4, textAlign: "center", fontSize: 11 },
  tdSmall: { border: "1px solid #000", padding: 4, textAlign: "right", fontSize: 11 },
  tdLeftSmall: { border: "1px solid #000", padding: 4, textAlign: "left", fontSize: 11 },

  footer: { display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 11 },
  footerLeft: {},
  footerRight: { display: "flex", gap: 24 },
  note: { maxWidth: 400 },
  sign: { textAlign: "center" },
  signLine: { width: 120, borderBottom: "1px solid #000", marginBottom: 4 },
};

const printStyles = `
@page { size: A4 landscape; margin: 12mm; }
@media print {
  body * { visibility: visible; }
  .report-page { box-shadow: none !important; margin: 0 !important; }
}
`;
