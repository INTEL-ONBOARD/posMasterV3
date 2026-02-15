// PettyCashReportGrouped.jsx
import React, { useMemo } from "react";

/**
 * PettyCashReportGrouped.jsx
 *
 * - Columns: Description | Form No | Sub-index | Previous day | Previous day Total | Current day Total
 * - Two main sections: "Price increases" and "Price deductions"
 * - Each main section contains sub-sections. Each sub-section includes items and ends with a subtotal row.
 * - Each main section ends with its subtotal. Bottom of table has grand totals.
 *
 * Note: I assumed 4 sub-sections (2 under each main section) per your mapping.
 */

function fmt(n) {
  return n ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-";
}

export default function PettyCashReportGrouped({ maxHeight = "calc(100vh - 120px)" }) {
  // Dummy data organized as main sections -> sub-sections -> items
  const data = useMemo(() => [
    {
      title: "Price increases",
      subsections: [
        {
          // sub-section 1
          title: "Section 1",
          items: [
            { desc: "Maximum", formNo: "P01", sub: "01", prevDay: 17735747.23, prevDayTotal: 17735747.23, currDayTotal: 0 },
            { desc: "Minimum", formNo: "P01", sub: "02", prevDay: 761605.0, prevDayTotal: 761605.0, currDayTotal: 0 },
            { desc: "Remaining items", formNo: "P01", sub: "03", prevDay: 18497352.23, prevDayTotal: 18497352.23, currDayTotal: 0 },
            { desc: "Received from Coop", formNo: "P01", sub: "04", prevDay: 1098934.95, prevDayTotal: 1098934.95, currDayTotal: 25880.0 },
            { desc: "Petty cash purchases", formNo: "P01", sub: "05", prevDay: 23215639.48, prevDayTotal: 23215639.48, currDayTotal: 5276819.45 },
          ],
        },
        {
          // sub-section 2
          title: "Section 2",
          items: [
            { desc: "Return items", formNo: "P02", sub: "01", prevDay: 4284027.25, prevDayTotal: 4284027.25, currDayTotal: 5276819.45 },
            { desc: "Price increases", formNo: "P02", sub: "02", prevDay: 16784091.92, prevDayTotal: 16784091.92, currDayTotal: 182347.6 },
            { desc: "Transfers", formNo: "P02", sub: "03", prevDay: 17883026.87, prevDayTotal: 17883026.87, currDayTotal: 207727.6 },
          ],
        },
      ],
    },

    {
      title: "Price deductions",
      subsections: [
        {
          // sub-section 3
          title: "Section 3",
          items: [
            { desc: "Cash transactions", formNo: "D01", sub: "01", prevDay: 25053.0, prevDayTotal: 25053.0, currDayTotal: 0 },
            { desc: "Credit transactions", formNo: "D01", sub: "02", prevDay: 14666.0, prevDayTotal: 14666.0, currDayTotal: 0 },
            { desc: "Giving for inventory", formNo: "D01", sub: "03", prevDay: 4123.84, prevDayTotal: 4123.84, currDayTotal: 0 },
            { desc: "Transfers", formNo: "D01", sub: "04", prevDay: 11950.32, prevDayTotal: 11950.32, currDayTotal: 0 },
          ],
        },
        {
          // sub-section 4
          title: "Section 4",
          items: [
            { desc: "Returns", formNo: "D02", sub: "01", prevDay: 17938820.03, prevDayTotal: 17938820.03, currDayTotal: 207727.6 },
            { desc: "Price deductions", formNo: "D02", sub: "02", prevDay: 5276819.45, prevDayTotal: 5276819.45, currDayTotal: 5069091.85 },
            { desc: "Damaged", formNo: "D02", sub: "03", prevDay: 23215639.48, prevDayTotal: 23215639.48, currDayTotal: 5276819.45 },
            { desc: "Other", formNo: "D02", sub: "04", prevDay: 0, prevDayTotal: 0, currDayTotal: 0 },
          ],
        },
      ],
    },
  ], []);

  // Helper to sum an array of items for a given field
  const sumItems = (items, field) => items.reduce((s, it) => s + (Number(it[field] || 0)), 0);

  // Compute all totals per structure
  const computed = useMemo(() => {
    const mains = data.map((main) => {
      const subs = main.subsections.map((sub) => {
        const subPrev = sumItems(sub.items, "prevDay");
        const subPrevTotal = sumItems(sub.items, "prevDayTotal");
        const subCurr = sumItems(sub.items, "currDayTotal");
        return { ...sub, totals: { prev: subPrev, prevTotal: subPrevTotal, curr: subCurr } };
      });
      const mainPrev = subs.reduce((s, ss) => s + ss.totals.prev, 0);
      const mainPrevTotal = subs.reduce((s, ss) => s + ss.totals.prevTotal, 0);
      const mainCurr = subs.reduce((s, ss) => s + ss.totals.curr, 0);
      return { title: main.title, subsections: subs, totals: { prev: mainPrev, prevTotal: mainPrevTotal, curr: mainCurr } };
    });

    const grandPrev = mains.reduce((s, m) => s + m.totals.prev, 0);
    const grandPrevTotal = mains.reduce((s, m) => s + m.totals.prevTotal, 0);
    const grandCurr = mains.reduce((s, m) => s + m.totals.curr, 0);

    return { mains, grand: { prev: grandPrev, prevTotal: grandPrevTotal, curr: grandCurr } };
  }, [data]);

  return (
    <div style={styles.scrollContainer(maxHeight)} >
      <div style={styles.page} className="petty-cash-page">
        <div style={styles.header}>
          <div style={styles.companyLine}>මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමූපකාර සමිතිය</div>
          <div style={styles.subCompany}>AllenValley Trade Center</div>
          <h2 style={styles.reportTitle}>Petty Cash Report(F-15)</h2>
          <div style={styles.metaRow}>
            <div><strong>Form No:</strong> F-15</div>
            <div><strong>Date:</strong> 25/09/2023</div>
            <div><strong>Prepared By:</strong> Accounts</div>
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
            {computed.mains.map((main, mIdx) => (
              <React.Fragment key={mIdx}>
                {/* Main section heading */}
                <tr>
                  <td style={{ ...styles.mainRow }} colSpan={6}>{main.title}</td>
                </tr>

                {main.subsections.map((sub, sIdx) => (
                  <React.Fragment key={sIdx}>
                    {/* Sub-section heading */}
                    <tr>
                      <td style={{ ...styles.subRow }} colSpan={6}>{sub.title}</td>
                    </tr>

                    {/* Items */}
                    {sub.items.map((it, iIdx) => (
                      <tr key={iIdx}>
                        <td style={{ ...styles.td, textAlign: "left", whiteSpace: "normal" }}>{it.desc}</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>{it.formNo}</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>{it.sub}</td>
                        <td style={styles.td}>{fmt(it.prevDay)}</td>
                        <td style={styles.td}>{fmt(it.prevDayTotal)}</td>
                        <td style={styles.td}>{fmt(it.currDayTotal)}</td>
                      </tr>
                    ))}

                    {/* Sub-section totals */}
                    <tr> 
                      <td style={styles.subtotalsRow} colSpan={3}>Sub-section Total</td>
                      <td style={styles.subtotalsRow}>{fmt(sub.totals.prev)}</td>
                      <td style={styles.subtotalsRow}>{fmt(sub.totals.prevTotal)}</td>
                      <td style={styles.subtotalsRow}>{fmt(sub.totals.curr)}</td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* Main section totals */}
                <tr>
                  <td style={styles.mainTotalsRow} colSpan={3}>{main.title} Total</td>
                  <td style={styles.mainTotalsRow}>{fmt(main.totals.prev)}</td>
                  <td style={styles.mainTotalsRow}>{fmt(main.totals.prevTotal)}</td>
                  <td style={styles.mainTotalsRow}>{fmt(main.totals.curr)}</td>
                </tr>
              </React.Fragment>
            ))}

            {/* Grand totals at bottom */}
            <tr>
              <td style={styles.grandTotalsRow} colSpan={3}>Grand Total (All Main Sections)</td>
              <td style={styles.grandTotalsRow}>{fmt(computed.grand.prev)}</td>
              <td style={styles.grandTotalsRow}>{fmt(computed.grand.prevTotal)}</td>
              <td style={styles.grandTotalsRow}>{fmt(computed.grand.curr)}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div style={styles.signatures}>
          {/* <div>
            <div style={styles.signatureLine}></div>
            <div>Prepared by</div>
          </div> */}
          <div>
            <div style={styles.signatureLine}></div>
            <div>Checked by</div>
          </div>
          <div>
            <div style={styles.signatureLine}></div>
            <div>Approved by</div>
          </div>
          {/* <div>
            <div style={styles.signatureLine}></div>
            <div>Store Keeper</div>
          </div> */}
        </div>

        {/* <div style={{ marginTop: 8, fontSize: 11, color: "#666" }}>
          Note: I used 4 sub-sections (two per main section) as described. If you want 6 sub-sections or different labels/data, tell me and I will update the component.
        </div> */}
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */
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

  // small column width used by Form No and Sub-index
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
