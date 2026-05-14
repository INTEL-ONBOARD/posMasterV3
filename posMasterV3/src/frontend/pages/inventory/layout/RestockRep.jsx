import React, { useState, useMemo } from "react";

/**
 * RestockRep.jsx
 *
 * - Dummy data via useState
 * - Pagination when total rows exceed ROWS_PER_PAGE
 * - Renders one React "page" per PDF page (use .report-page selector when capturing)
 */

const ROWS_PER_PAGE = 16; // adjust if you need more/less rows per A4 page

function makeDummy(codePrefix, n, start = 1) {
  return Array.from({ length: n }, (_, i) => {
    const idx = start + i;
    return {
      id: `${codePrefix}${("000" + idx).slice(-3)}`,
      code: `${codePrefix}${("000" + idx).slice(-3)}`,
      unitCount: `${30 + (i % 3)}(pcs)`,
      stockPrice: (12300 - (i % 5) * 500).toFixed(2),
      stockTotal: (12300 - (i % 5) * 500).toFixed(2),
      retailPrice: (12500 - (i % 5) * 450).toFixed(2),
      retailTotal: (12300 - (i % 5) * 500).toFixed(2),
    };
  });
}

export default function RestockRep({maxHeight="calc(100vh - 300px)"}) {
  // dummy data: 20 restocked, 6 returned (adjust numbers to trigger pagination)
  const [restocked] = useState(() => makeDummy("RS", 20, 1));
  const [returned] = useState(() => makeDummy("RT", 6, 1));

  // flatten into combined list with type marker
  const combined = useMemo(() => {
    const arr = [];
    restocked.forEach((r) => arr.push({ ...r, type: "restock" }));
    returned.forEach((r) => arr.push({ ...r, type: "returned" }));
    return arr;
  }, [restocked, returned]);

  // paginate combined rows into pages
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < combined.length; i += ROWS_PER_PAGE) {
      out.push(combined.slice(i, i + ROWS_PER_PAGE));
    }
    // ensure at least one page even if no rows
    return out.length ? out : [[]];
  }, [combined]);

  // simple totals (dummy)
  const totalRestocked = restocked.reduce((s, r) => s + parseFloat(r.stockTotal), 0);
  const totalReturned = returned.reduce((s, r) => s + parseFloat(r.stockTotal), 0);
  const totalDiscount = 1700;
  const totalAmount = totalRestocked - totalReturned - totalDiscount;

  return (
    <div style={styles.scrollContainer(maxHeight)}>
    <div >
      {pages.map((pageItems, pageIndex) => {
        const globalStartIndex = pageIndex * ROWS_PER_PAGE;
        const isLastPage = pageIndex === pages.length - 1;

        return (
          <div
            key={`restock-page-${pageIndex}`}
            // restock-page is used by query selector for printing these pages via querySelector
            className="restock-page"
            style={{ ...styles.page, pageBreakAfter: "always" }}
          >
            {/* Header */}
            <div style={styles.header}>
              <h1 style={styles.company}>මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමූපකාර සමිතිය</h1>
              <div style={styles.subCompany}>Kotapala-Retail</div>
              <h2 style={styles.reportTitle}>Stock Acceptance Report</h2>
            </div>

            {/* Meta */}
            <div style={styles.metaRow}>
              <div><strong>Invoice No:</strong> REPC2456XS</div>
              <div><strong>Supplier:</strong> Ranathunga PVT. LTD</div>
              <div><strong>Index:</strong> RPT3244546565</div>
              <div><strong>Date:</strong> 2023-03-02</div>
            </div>

            <hr style={styles.divider} />

            {/* Table: we show one combined table and insert section headings inside tbody when type changes */}
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Item code</th>
                  <th style={styles.th}>Unit count</th>
                  <th style={styles.th}>Stock Price</th>
                  <th style={styles.th}>Stock Total</th>
                  <th style={styles.th}>Retail Price</th>
                  <th style={styles.th}>Retail Total</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={7}>No items</td>
                  </tr>
                ) : null}

                {pageItems.map((item, rowIndex) => {
                  const globalIndex = globalStartIndex + rowIndex;
                  const prev = combined[globalIndex - 1];
                  const showSectionHeading =
                    // show heading if this is first of page OR type differs from previous overall item
                    globalIndex === 0 || !prev || prev.type !== item.type || rowIndex === 0 && (globalIndex > 0 && prev && prev.type === item.type && prev.type !== item.type);

                  // Determine continuation label: if this page's first row for this section is not the first overall occurrence
                  let sectionLabel = "";
                  if (showSectionHeading && item.type === "restock") {
                    // check if this is continuation (previous overall exists and is restock)
                    const continued = combined.findIndex((x) => x.type === "restock") < globalIndex && combined[globalIndex - 1] && combined[globalIndex - 1].type === "restock";
                    sectionLabel = continued ? "Restocked (cont.)" : "Restocked";
                  } else if (showSectionHeading && item.type === "returned") {
                    const firstReturnedIndex = combined.findIndex((x) => x.type === "returned");
                    const continued = firstReturnedIndex < globalIndex && combined[globalIndex - 1] && combined[globalIndex - 1].type === "returned";
                    sectionLabel = continued ? "Returned (cont.)" : "Returned";
                  }

                  return (
                    <React.Fragment key={`${item.id || item.code || "restock-item"}-${globalIndex}`}>
                      {showSectionHeading ? (
                        <tr>
                          <td style={{ ...styles.sectionRow }} colSpan={7}>{sectionLabel}</td>
                        </tr>
                      ) : null}

                      <tr>
                        <td style={styles.td}>{globalIndex + 1}</td>
                        <td style={styles.td}>{item.code}</td>
                        <td style={styles.td}>{item.unitCount}</td>
                        <td style={styles.td}>{Number(item.stockPrice).toLocaleString()}</td>
                        <td style={styles.td}>{Number(item.stockTotal).toLocaleString()}</td>
                        <td style={styles.td}>{Number(item.retailPrice).toLocaleString()}</td>
                        <td style={styles.td}>{Number(item.retailTotal).toLocaleString()}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* If last page render summary & signatures, otherwise leave reserved space */}
            {isLastPage ? (
              <>
                <div style={styles.summary}>
                  <div style={styles.summaryRow}><span>Restocked</span><span>{totalRestocked.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  <div style={styles.summaryRow}><span>Returned</span><span>{totalReturned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  <div style={styles.summaryRow}><span>Discount</span><span>{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  <div style={{ ...styles.summaryRow, ...styles.total }}><span>Total Amount</span><span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  <div style={styles.summaryRow}><span>Cash Amount</span><span>2,300.00</span></div>
                  <div style={styles.summaryRow}><span>Change Amount</span><span>110,000.00</span></div>
                </div>

                <div style={styles.signatures}>
                  <div>
                    <div style={styles.signatureLine}></div>
                    <div>Created by</div>
                  </div>
                  <div>
                    <div style={styles.signatureLine}></div>
                    <div>Accepted by</div>
                  </div>
                  <div>
                    <div style={styles.signatureLine}></div>
                    <div>Inspected by</div>
                  </div>
                  <div>
                    <div style={styles.signatureLine}></div>
                    <div>Inventory keeper</div>
                  </div>
                </div>
              </>
            ) : (
              // reserved footer spacing to keep pages consistent
              <div style={{ height: "220px" }} />
            )}
          </div>
        );
      })}

    </div>
    </div>
  );
}

/* ===================== STYLES ===================== */
const styles = {
    scrollContainer: (maxHeight) => ({
    overflow: "auto",
    maxHeight,
    backgroundColor: "#f9fafb",
  }),
  
  page: {
    width: "794px", // A4 width @ 96dpi
    minHeight: "1123px", // A4 height @ 96dpi
    margin: "0 auto 24px",
    padding: "32px",
    backgroundColor: "#ffffff",
    fontFamily: "Arial, sans-serif",
    color: "#333",
    boxSizing: "border-box",
  },

  header: {
    textAlign: "center",
    marginBottom: "12px",
  },
  company: {
    fontSize: "18px",
    margin: 0,
  },
  subCompany: {
    fontSize: "14px",
    marginBottom: "6px",
  },
  reportTitle: {
    fontSize: "18px",
    marginTop: "6px",
  },

  metaRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    fontSize: "12px",
    marginBottom: "10px",
  },

  divider: {
    margin: "12px 0",
    border: "none",
    borderTop: "1px solid #ddd",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    marginBottom: "12px",
  },

  th: {
    backgroundColor: "#444",
    color: "#fff",
    padding: "8px",
    textAlign: "center",
    fontSize: "11px",
  },

  td: {
    padding: "8px",
    borderBottom: "1px solid #eee",
    textAlign: "center",
  },

  sectionRow: {
    padding: "8px",
    backgroundColor: "#f3f3f3",
    textAlign: "left",
    fontWeight: 700,
    color: "#333",
  },

  summary: {
    backgroundColor: "#e6e6e6",
    padding: "12px",
    fontSize: "12px",
    marginTop: "10px",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
  },

  total: {
    fontWeight: "700",
    borderTop: "1px solid rgba(0,0,0,0.08)",
    marginTop: "8px",
    paddingTop: "8px",
  },

  signatures: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginTop: "32px",
    fontSize: "11px",
    textAlign: "center",
  },

  signatureLine: {
    borderBottom: "1px dotted #000",
    marginBottom: "6px",
    height: "20px",
  },
};

/* attach th/td to table style for easy use */
Object.assign(styles.table, {
  th: styles.th,
  td: styles.td,
});
