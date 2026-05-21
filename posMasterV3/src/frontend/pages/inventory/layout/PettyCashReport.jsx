import React, { useMemo } from "react";

function fmt(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-";
}

function formatReportDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB");
}

export default function PettyCashReport({
  reportData,
  data,
  companyName = "AllenValley Trade Center",
  branchName = "",
  reportDate = "",
  preparedBy = "Accounts",
  maxHeight = "calc(100vh - 120px)",
}) {
  const displayData = useMemo(() => {
    const source = Array.isArray(reportData) && reportData.length > 0 ? reportData : data;
    return Array.isArray(source) ? source : [];
  }, [reportData, data]);

  const sumItems = (items, field) =>
    (Array.isArray(items) ? items : []).reduce((sum, item) => sum + Number(item?.[field] || 0), 0);

  const computed = useMemo(() => {
    const mains = displayData.map((main) => {
      const subsections = (Array.isArray(main.subsections) ? main.subsections : []).map((sub) => {
        const items = Array.isArray(sub.items) ? sub.items : [];
        const totals = {
          prev: sumItems(items, "prevDay"),
          prevTotal: sumItems(items, "prevDayTotal"),
          curr: sumItems(items, "currDayTotal"),
        };

        return { ...sub, items, totals };
      });

      const totals = subsections.reduce(
        (acc, sub) => {
          acc.prev += sub.totals.prev;
          acc.prevTotal += sub.totals.prevTotal;
          acc.curr += sub.totals.curr;
          return acc;
        },
        { prev: 0, prevTotal: 0, curr: 0 }
      );

      return { ...main, subsections, totals };
    });

    const grand = mains.reduce(
      (acc, main) => {
        acc.prev += main.totals.prev;
        acc.prevTotal += main.totals.prevTotal;
        acc.curr += main.totals.curr;
        return acc;
      },
      { prev: 0, prevTotal: 0, curr: 0 }
    );

    return { mains, grand };
  }, [displayData]);

  return (
    <div style={styles.scrollContainer(maxHeight)}>
      <div style={styles.page} className="petty-cash-page">
        <div style={styles.header}>
          <div style={styles.companyLine}>{companyName}</div>
          {branchName ? <div style={styles.subCompany}>{branchName}</div> : null}
          <h2 style={styles.reportTitle}>Petty Cash Report(F-15)</h2>
          <div style={styles.metaRow}>
            <div><strong>Form No:</strong> F-15</div>
            <div><strong>Date:</strong> {formatReportDate(reportDate)}</div>
            <div><strong>Prepared By:</strong> {preparedBy}</div>
            <div><strong>Page:</strong> 1 of 1</div>
          </div>
        </div>

        <hr style={styles.divider} />

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, textAlign: "left" }}>Description</th>
              <th style={{ ...styles.th, width: styles.colSmall.width }}>Form No</th>
              <th style={{ ...styles.th, width: styles.colSmall.width }}>Sub-index</th>
              <th style={styles.th}>Previous day</th>
              <th style={styles.th}>Previous day Total</th>
              <th style={styles.th}>Current day Total</th>
            </tr>
          </thead>

          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td style={styles.emptyState} colSpan={6}>
                  No data available
                </td>
              </tr>
            ) : (
              <>
                {computed.mains.map((main, mIdx) => (
                  <React.Fragment key={`main-${mIdx}`}>
                    <tr>
                      <td style={styles.mainRow} colSpan={6}>
                        {main.title}
                      </td>
                    </tr>

                    {main.subsections.map((sub, sIdx) => (
                      <React.Fragment key={`sub-${sIdx}`}>
                        <tr>
                          <td style={styles.subRow} colSpan={6}>
                            {sub.title}
                          </td>
                        </tr>

                        {sub.items.map((it, iIdx) => (
                          <tr key={`item-${iIdx}`}>
                            <td style={{ ...styles.td, textAlign: "left", whiteSpace: "normal" }}>{it.desc}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{it.formNo}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{it.sub}</td>
                            <td style={styles.td}>{fmt(it.prevDay)}</td>
                            <td style={styles.td}>{fmt(it.prevDayTotal)}</td>
                            <td style={styles.td}>{fmt(it.currDayTotal)}</td>
                          </tr>
                        ))}

                        <tr>
                          <td style={styles.subtotalsRow} colSpan={3}>
                            Sub-section Total
                          </td>
                          <td style={styles.subtotalsRow}>{fmt(sub.totals.prev)}</td>
                          <td style={styles.subtotalsRow}>{fmt(sub.totals.prevTotal)}</td>
                          <td style={styles.subtotalsRow}>{fmt(sub.totals.curr)}</td>
                        </tr>
                      </React.Fragment>
                    ))}

                    <tr>
                      <td style={styles.mainTotalsRow} colSpan={3}>
                        {main.title} Total
                      </td>
                      <td style={styles.mainTotalsRow}>{fmt(main.totals.prev)}</td>
                      <td style={styles.mainTotalsRow}>{fmt(main.totals.prevTotal)}</td>
                      <td style={styles.mainTotalsRow}>{fmt(main.totals.curr)}</td>
                    </tr>
                  </React.Fragment>
                ))}

                <tr>
                  <td style={styles.grandTotalsRow} colSpan={3}>
                    Grand Total (All Main Sections)
                  </td>
                  <td style={styles.grandTotalsRow}>{fmt(computed.grand.prev)}</td>
                  <td style={styles.grandTotalsRow}>{fmt(computed.grand.prevTotal)}</td>
                  <td style={styles.grandTotalsRow}>{fmt(computed.grand.curr)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div style={styles.signatures}>
          <div>
            <div style={styles.signatureLine}></div>
            <div>Checked by</div>
          </div>
          <div>
            <div style={styles.signatureLine}></div>
            <div>Approved by</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  scrollContainer: (maxHeight) => ({
    overflow: "auto",
    maxHeight,
    backgroundColor: "#f4f6f8",
    padding: 16,
  }),

  page: {
    width: "794px",
    minHeight: "1123px",
    margin: "0 auto",
    padding: "38px",
    backgroundColor: "#fff",
    fontFamily: "Arial, sans-serif",
    color: "#222",
    boxSizing: "border-box",
  },

  header: { textAlign: "center", marginBottom: "8px" },
  companyLine: { fontSize: 18, fontWeight: 700 },
  subCompany: { fontSize: 16, marginBottom: 4 },
  reportTitle: { fontSize: 18, margin: "6px 0 6px" },
  metaRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    fontSize: "12px",
  },

  divider: { margin: "12px 0", border: "none", borderTop: "1px solid #ddd" },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    marginBottom: "12px",
    tableLayout: "fixed",
  },

  th: {
    backgroundColor: "#2c3e50",
    color: "#fff",
    padding: "8px",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 600,
  },

  td: {
    padding: "8px",
    borderBottom: "1px solid #eee",
    textAlign: "center",
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  emptyState: {
    padding: "18px 8px",
    textAlign: "center",
    color: "#6b7280",
    backgroundColor: "#fafafa",
    borderBottom: "1px solid #eee",
    fontSize: "13px",
  },

  mainRow: {
    padding: "10px 8px",
    backgroundColor: "#dfeaf6",
    fontWeight: 800,
    textAlign: "left",
    color: "#123",
    borderTop: "1px solid #cfcfcf",
  },

  subRow: {
    padding: "8px",
    backgroundColor: "#f6f9fb",
    fontWeight: 700,
    textAlign: "left",
    color: "#222",
  },

  subtotalsRow: {
    padding: "8px",
    backgroundColor: "#fff6e6",
    textAlign: "center",
    fontWeight: 700,
    borderTop: "1px solid #e6d8b0",
  },

  mainTotalsRow: {
    padding: "8px",
    backgroundColor: "#f0f4f8",
    textAlign: "center",
    fontWeight: 800,
    borderTop: "2px solid #d0d8e6",
  },

  grandTotalsRow: {
    padding: "10px",
    backgroundColor: "#e8f6ef",
    textAlign: "center",
    fontWeight: 900,
    borderTop: "2px solid #cfe6d9",
  },

  colSmall: {
    width: "60px",
    minWidth: "48px",
    maxWidth: "80px",
  },

  signatures: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "18px",
    marginTop: "20px",
    fontSize: "12px",
    textAlign: "center",
  },

  signatureLine: {
    borderBottom: "1px dotted #000",
    marginBottom: "6px",
    height: "18px",
  },
};
