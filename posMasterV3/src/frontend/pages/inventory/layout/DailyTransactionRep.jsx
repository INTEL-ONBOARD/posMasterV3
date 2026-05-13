import React, { useMemo } from "react";

/**
 * DailyTransactionReportPaginated.jsx
 *
 * - Guests exist only under the "Cash" payment type.
 * - Guest rows do not show a Mem. No value (cell left empty).
 * - Pagination logic preserved.
 * - Totals page rowSpan adjusts: non-cash => 2 customer rows (Member, Staff), cash => 3 rows (Member, Staff, Guest).
 */

const ROWS_PER_PAGE = 16;

function makeRows(count, baseIdx = 1) {
  return Array.from({ length: count }, (_, i) => {
    const n = baseIdx + i;
    return {
      type: "data",
      idx: n,
      invNo: "54343343",
      memNo: "04566546",
      name: "A.P. Asela",
      price: 18200.0,
    };
  });
}

const MAIN_SECTIONS = [
  "06 Months",
  "03 Months",
  "02 Months",
  "01 Months",
  "B.O.G",
  "Cash",
];

const CUSTOMER_TYPES = ["Member", "Staff", "Guest"];
const DUMMY_COUNTS = {
  "06 Months": { Member: 6, Staff: 3, Guest: 0 },
  "03 Months": { Member: 2, Staff: 2, Guest: 0 },
  "02 Months": { Member: 4, Staff: 4, Guest: 0 },
  "01 Months": { Member: 1, Staff: 1, Guest: 0 },
  "B.O.G": { Member: 3, Staff: 3, Guest: 0 },
  "Cash": { Member: 5, Staff: 2, Guest: 2 },
};

export default function DailyTransactionReportPaginated({ maxHeight = "calc(100vh - 160px)" }) {
  // Build flattened rows and include explicit customer-header rows so pagination is accurate.
  const flattened = useMemo(() => {
    const out = [];
    let globalDataIdx = 1;

    MAIN_SECTIONS.forEach((sec) => {
      out.push({ type: "section", title: sec });

      // choose which customer-types actually apply to this section
      const customersForSection = sec === "Cash" ? CUSTOMER_TYPES : CUSTOMER_TYPES.filter((c) => c !== "Guest");

      customersForSection.forEach((cust) => {
        out.push({ type: "customer", title: cust, parent: sec });

        // explicit header row for this customer's mini-table (counts as a visible row)
        out.push({ type: "custHeader", title: cust, parent: sec });

        const count = (DUMMY_COUNTS[sec] && DUMMY_COUNTS[sec][cust]) || 0;
        if (count > 0) {
          const rows = makeRows(count, globalDataIdx);
          rows.forEach((r) => {
            // For Guest rows we keep memNo blank at render-time (we still include property)
            out.push({ ...r, section: sec, customer: cust });
            globalDataIdx++;
          });
        }

        out.push({ type: "subtotal", section: sec, customer: cust });
      });
    });

    return out;
  }, []);

  // paginate by flattened visible rows
  const pages = useMemo(() => {
    const p = [];
    for (let i = 0; i < flattened.length; i += ROWS_PER_PAGE) {
      p.push(flattened.slice(i, i + ROWS_PER_PAGE));
    }
    return p.length ? p : [[]];
  }, [flattened]);

  // helper compute subtotal for section+customer
  const computeSubtotal = (section, customer) =>
    flattened
      .filter((r) => r.type === "data" && r.section === section && r.customer === customer)
      .reduce((s, r) => s + (r.price || 0), 0);

  // totals per payment type (section)
  const totalsPerSection = useMemo(() => {
    const t = {};
    MAIN_SECTIONS.forEach((sec) => {
      t[sec] = flattened
        .filter((r) => r.type === "data" && r.section === sec)
        .reduce((s, r) => s + (r.price || 0), 0);
    });
    return t;
  }, [flattened]);

  const grandTotal = Object.values(totalsPerSection).reduce((s, v) => s + v, 0);

  // helper to get first index of a predicate in flattened (for continuation detection)
  const firstIndexOf = (predicate) => {
    for (let i = 0; i < flattened.length; i++) if (predicate(flattened[i])) return i;
    return -1;
  };

  const totalPages = pages.length + 1;

  const fmt = (v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div style={styles.container(maxHeight)}>
      {/* Render content pages */}
      {pages.map((pageRows, pageIndex) => {
        const globalStartIndex = pageIndex * ROWS_PER_PAGE;

        return (
          <div
            key={pageIndex}
            // daily-page is used by query selector for printing these pages via querySelector
            className="daily-page"
            style={{ ...styles.page, pageBreakAfter: "always" }}
          >
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.companySinhala}>මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමූපකාර සමිතිය</div>
              <div style={styles.subCompany}>AllenValley Trade Center</div> {/* branch */}
              <div style={styles.title}>Daily Transaction Report</div> {/* report name */}
            </div>

            {/* Meta */}
            <div style={styles.meta}>
              <div>
                <strong>No:</strong> GDG343CFF
              </div>
              <div>
                <strong>Date:</strong> 2025-11-25
              </div>
            </div>

            <hr style={styles.hr} />

            {/* Single table per page - but every customer block prints its own header row (custHeader) */}
            <table style={styles.table}>
              <tbody>
                {pageRows.length === 0 ? <tr>
                  <td style={styles.td} colSpan={5}>No rows</td>
                </tr> : null}

                {pageRows.map((row, idxOnPage) => {
                  const globalIndex = globalStartIndex + idxOnPage;

                  if (row.type === "section") {
                    const firstSecIdx = firstIndexOf((x) => x.type === "section" && x.title === row.title);
                    const continued = firstSecIdx < globalIndex;
                    return (
                      <tr key={`sec-${globalIndex}`}>
                        <td style={styles.sectionCell} colSpan={5}>
                          <strong>{row.title}{continued ? " (cont.)" : ""}</strong>
                          <hr />
                        </td>
                      </tr>
                    );
                  }

                  if (row.type === "customer") {
                    const firstCustIdx = firstIndexOf((x) => x.type === "customer" && x.title === row.title && x.parent === row.parent);
                    const continued = firstCustIdx < globalIndex;
                    return (
                      <tr key={`cust-${globalIndex}`}>
                        <td style={styles.customerCell} colSpan={5}>
                          <em>{row.title}{continued ? " (cont.)" : ""}</em>
                        </td>
                      </tr>
                    );
                  }

                  if (row.type === "custHeader") {
                    // For Guest we still render the Mem. No header cell but leave it blank (no Mem No field)
                    const isGuest = row.title === "Guest";
                    return (
                      <tr key={`custHeader-${globalIndex}`} style={styles.custHeaderRow}>
                        <th style={styles.thSmall}>#</th>
                        <th style={styles.th}>Inv. No</th>
                        <th style={styles.th}>{isGuest ? "" : "Mem. No"}</th>
                        <th style={styles.thLeft}>Name</th>
                        <th style={styles.thRight}>Price(Rs.)</th>
                      </tr>
                    );
                  }

                  if (row.type === "data") {
                    const isGuestRow = row.customer === "Guest";
                    return (
                      <tr key={`row-${row.idx}-${globalIndex}`}>
                        <td style={styles.tdSmall}>{row.idx}</td>
                        <td style={styles.td}>{row.invNo}</td>
                        {/* Guest has no Mem. No -> render empty cell */}
                        <td style={styles.td}>{isGuestRow ? "" : row.memNo}</td>
                        <td style={styles.tdLeft}>{row.name}</td>
                        <td style={styles.tdRight}>{Number(row.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  }

                  if (row.type === "subtotal") {
                    const st = computeSubtotal(row.section, row.customer);
                    return (
                      <tr key={`sub-${row.section}-${row.customer}-${globalIndex}`}>
                        <td colSpan={4} style={styles.subtotalCell}></td>
                        <td style={styles.subtotalRight}>
                          <div style={styles.subtotalLine} />
                          <div style={styles.subtotalAmount}>{Number(st).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                      </tr>
                    );
                  }

                  return null;
                })}
              </tbody>
            </table>

            <div style={styles.footer}>page {pageIndex + 1} of {totalPages}</div>
          </div>
        );
      })}

      {/* Totals Page (four-column layout; customer rows count depends on section) */}
      <div className="daily-page totals-page" style={{ ...styles.page }}>  {/* daily-page is used by query selector for printing these pages via querySelector */}
        <div style={styles.header}>
          <div style={styles.companySinhala}>මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමූපකාර සමිතිය</div>
          <div style={styles.subCompany}>Kotawala</div>
          <div style={styles.title}>Daily Transaction Report — Totals</div>
        </div>

        <div style={styles.meta}>
          <div><strong>No:</strong> GDG343CFF</div>
          <div><strong>Date:</strong> 2025-11-25</div>
        </div>

        <hr style={styles.hr} />

        <table style={{ ...styles.table }}>
          <thead>
            <tr>
              <th style={styles.th}>Payment Type</th>
              <th style={styles.th}>Customer Type</th>
              <th style={styles.thRight}>Amount (Rs.)</th>
              <th style={styles.thRight}>Payment Total (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {MAIN_SECTIONS.map((sec) => {
              const sectionTotal = totalsPerSection[sec] || 0;
              const customersForSection = sec === "Cash" ? CUSTOMER_TYPES : CUSTOMER_TYPES.filter((c) => c !== "Guest");
              const rowSpanCount = customersForSection.length;

              return (
                <React.Fragment key={`totblock-${sec}`}>
                  {customersForSection.map((cust, i) => {
                    const custAmount = computeSubtotal(sec, cust);
                    return (
                      <tr key={`${sec}-${cust}`}>
                        {/* Payment Type cell only on first of rowsForSection. verticalAlign: 'top' */}
                        {i === 0 ? (
                          <td
                            rowSpan={rowSpanCount}
                            style={{ ...styles.td, verticalAlign: "top", fontWeight: 700, paddingTop: 6 }}
                          >
                            {sec}
                          </td>
                        ) : null}

                        <td style={styles.td}>{cust}</td>
                        <td style={styles.tdRight}>{fmt(custAmount)}</td>

                        {/* Payment total cell only on first of rowsForSection. verticalAlign: 'bottom' */}
                        {i === 0 ? (
                          <td
                            rowSpan={rowSpanCount}
                            style={{ ...styles.tdRight, verticalAlign: "bottom", fontWeight: 700, paddingBottom: 6 }}
                          >
                            {fmt(sectionTotal)}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}

                  {/* Separator row AFTER the customer rows for this section:
                      - leave first 2 columns empty
                      - draw a top border spanning columns 3 and 4
                  */}
                  <tr key={`sep-${sec}`}>
                    <td colSpan={2} style={styles.sepCell}></td>
                    <td colSpan={2} style={styles.sepLine}></td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* Grand total row */}
            <tr>
              <td colSpan={2} style={{ ...styles.td, fontWeight: 700, borderTop: "1px solid rgba(0,0,0,0.15)" }}>
                Grand Total
              </td>
              <td style={{ ...styles.tdRight, fontWeight: 700, borderTop: "1px solid rgba(0,0,0,0.15)" }}>
                {fmt(grandTotal)}
              </td>
              <td style={{ ...styles.tdRight, fontWeight: 700, borderTop: "1px solid rgba(0,0,0,0.15)" }}>
                {fmt(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={styles.footer}>page {totalPages} of {totalPages}</div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: (maxHeight) => ({
    overflow: "auto",
    maxHeight,
    background: "#f6f6f6",
    padding: 20,
  }),
  page: {
    width: 794,
    height: 1123,            // fixed page height
    margin: "0 auto 20px",
    padding: 82,             // keep your padding if you want
    background: "#fff",
    boxSizing: "border-box", // IMPORTANT: include padding inside height
    fontFamily: '"Times New Roman", Georgia, serif',
    color: "#222",
    position: "relative",    // contains the absolute footer
    overflow: "hidden"       // prevent any accidental overflow to a new page
  },

  header: {
    textAlign: "center",
    marginBottom: 6,
  },
  companySinhala: {
    fontSize: 16,
    fontWeight: 600,
  },
  subCompany: {
    fontSize: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 16,
    marginTop: 6,
    fontWeight: 700,
  },

  meta: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 16,
    display: "flex",
    gap: 24,
  },

  hr: {
    border: "none",
    borderTop: "1px solid rgba(0,0,0,0.15)",
    margin: "8px 0 10px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 16,
    marginBottom: 10,
  },

  thSmall: {
    width: 28,
    textAlign: "left",
    padding: "6px 6px",
    fontWeight: 700,
    background: "#fafafa",
  },
  th: {
    textAlign: "left",
    padding: "6px 6px",
    fontWeight: 700,
    background: "#fafafa",
  },
  thLeft: {
    textAlign: "left",
    padding: "6px 6px",
    fontWeight: 700,
    background: "#fafafa",
  },
  thRight: {
    textAlign: "right",
    padding: "6px 6px",
    fontWeight: 700,
    background: "#fafafa",
    width: 140,
  },

  tdSmall: {
    padding: "2px 8px",
    color: "#555",
    width: 28,
  },
  td: {
    padding: "2px 8px",
    color: "#555",
  },
  tdLeft: {
    padding: "2px 8px",
    textAlign: "left",
    color: "#555",
  },
  tdRight: {
    padding: "2px 8px",
    textAlign: "right",
    color: "#555",
    width: 140,
  },

  sectionCell: {
    padding: "10px 6px",
    background: "#fafafa",
    fontWeight: 700,
    borderTop: "1px solid rgba(0,0,0,0.05)",
  },
  customerCell: {
    padding: "8px 6px",
    background: "#fff",
    // fontStyle: "italic",
    color: "#333",
  },

  custHeaderRow: {
    // style the header row for each customer mini-table (keeps it visible / distinct)
    background: "#fff",
  },

  subtotalCell: {
    padding: "8px 6px",
  },
  subtotalRight: {
    padding: "8px 6px",
    textAlign: "right",
  },
  subtotalLine: {
    borderTop: "1px solid rgba(0,0,0,0.12)",
    marginTop: 6,
    marginBottom: 6,
  },
  subtotalAmount: {
    fontWeight: 700,
  },

  summaryArea: {
    marginTop: 12,
    background: "#f3f3f3",
    padding: 8,
    fontSize: 16,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
  },


  footer: {
    position: "absolute",
    right: 28,
    bottom: 12,
    fontSize: 16,
    color: "#444",
  },

  // add near the other style entries
  sepCell: {
    padding: 0,
    border: "none",
    height: 6,
  },
  sepLine: {
    padding: 0,
    borderTop: "1px solid rgba(0,0,0,0.15)",
    height: 0,
  },
};
