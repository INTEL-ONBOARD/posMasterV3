import React, { useMemo } from "react";

const ROWS_PER_PAGE = 16;

const SECTION_ORDER = ["06 Months", "03 Months", "02 Months", "01 Months", "B.O.G", "Cash"];
const TYPE_ORDER = ["Member", "Staff", "Guest"];

const fmt = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function normalizeDurationLabel(value, paymentMethod = "") {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return String(paymentMethod).toLowerCase() === "cash" ? "Cash" : "Cash";
  }

  if (/^cash$/i.test(raw)) return "Cash";
  if (/^b\.?o\.?g\.?$/i.test(raw)) return "B.O.G";

  const monthMatch = raw.match(/(\d+)\s*(?:months?|mos?)/i);
  if (monthMatch) {
    return `${String(Number(monthMatch[1])).padStart(2, "0")} Months`;
  }

  const numericMatch = raw.match(/^(\d+)$/);
  if (numericMatch) {
    return `${String(Number(numericMatch[1])).padStart(2, "0")} Months`;
  }

  return raw.replace(/\s+/g, " ");
}

function normalizeCustomerType(transaction = {}) {
  const explicitType =
    transaction.customer_type ??
    transaction.customerType ??
    transaction.type ??
    transaction.member_type ??
    transaction.memberType ??
    "";

  const text = String(explicitType || "").trim().toLowerCase();
  if (text.includes("staff") || text.includes("employee") || text.includes("worker")) return "Staff";
  if (text.includes("guest") || text.includes("walk")) return "Guest";
  if (text.includes("member") || ["regular", "vip", "wholesale", "tea_coop"].includes(text)) return "Member";

  if (transaction.is_staff || transaction.isStaff || transaction.staff_id || transaction.staffId) {
    return "Staff";
  }

  if (transaction.member_id || transaction.memberId || transaction.member_no || transaction.memberNo) {
    return "Member";
  }

  return "Staff";
}

function normalizeDailyRow(transaction = {}) {
  const duration = normalizeDurationLabel(
    transaction.credit_duration ??
      transaction.creditDuration ??
      transaction.duration ??
      transaction.duration_label ??
      transaction.durationLabel ??
      "",
    transaction.payment_method ?? transaction.paymentMethod ?? ""
  );

  const customerType = normalizeCustomerType(transaction);

  const invoiceNo =
    transaction.invoice_no ??
    transaction.invoiceNo ??
    transaction.bill_no ??
    transaction.billNo ??
    "";

  const memberNo =
    transaction.member_no ??
    transaction.memberNo ??
    "";

  const name =
    transaction.member_name ??
    transaction.memberName ??
    "Guest";

  const price = Number(transaction.total_amount ?? transaction.totalAmount ?? transaction.amount ?? 0) || 0;

  return {
    ...transaction,
    invoice_no: invoiceNo,
    invoiceNo,
    member_no: memberNo,
    memberNo,
    member_name: name,
    memberName: name,
    credit_duration: duration,
    creditDuration: duration,
    duration,
    customer_type: customerType,
    customerType,
    transaction_type: customerType,
    price,
    total_amount: price,
    totalAmount: price,
  };
}

function buildReportModel(transactions = []) {
  const normalizedTransactions = Array.isArray(transactions)
    ? transactions.map((transaction) => normalizeDailyRow(transaction))
    : [];

  const grouped = new Map();
  normalizedTransactions.forEach((transaction) => {
    const duration = transaction.duration || "Cash";
    const type = transaction.customer_type || "Member";

    if (!grouped.has(duration)) {
      grouped.set(duration, new Map());
    }

    const typeMap = grouped.get(duration);
    if (!typeMap.has(type)) {
      typeMap.set(type, []);
    }

    typeMap.get(type).push(transaction);
  });

  const knownDurations = [...SECTION_ORDER.filter((duration) => grouped.has(duration))];
  const extraDurations = [...grouped.keys()].filter((duration) => !SECTION_ORDER.includes(duration)).sort();
  const orderedDurations = [...knownDurations, ...extraDurations];

  const flattened = [];
  const subtotalBySectionType = new Map();
  const sectionTotals = new Map();
  let runningIndex = 1;

  orderedDurations.forEach((duration) => {
    const typeMap = grouped.get(duration);
    const orderedTypes = [
      ...TYPE_ORDER.filter((type) => typeMap.has(type)),
      ...[...typeMap.keys()].filter((type) => !TYPE_ORDER.includes(type)).sort(),
    ];

    if (orderedTypes.length === 0) return;

    flattened.push({ type: "section", title: duration });

    orderedTypes.forEach((type) => {
      const rows = typeMap.get(type) || [];
      if (!rows.length) return;

      flattened.push({ type: "customer", title: type, parent: duration });
      flattened.push({ type: "custHeader", title: type, parent: duration });

      let subtotal = 0;
      rows.forEach((row) => {
        const price = Number(row.price || row.totalAmount || 0) || 0;
        subtotal += price;
        flattened.push({
          type: "data",
          idx: runningIndex++,
          section: duration,
          customer: type,
          invNo: row.invoice_no || row.invoiceNo || "",
          memNo: row.member_no || row.memberNo || "",
          name: row.member_name || row.memberName || "Guest",
          price,
        });
      });

      subtotalBySectionType.set(`${duration}::${type}`, subtotal);
      sectionTotals.set(duration, (sectionTotals.get(duration) || 0) + subtotal);
      flattened.push({ type: "subtotal", section: duration, customer: type, subtotal });
    });
  });

  const grandTotal = [...sectionTotals.values()].reduce((sum, value) => sum + value, 0);

  return {
    flattened,
    orderedDurations,
    grouped,
    subtotalBySectionType,
    sectionTotals,
    grandTotal,
  };
}

function LoadingState() {
  return (
    <div style={styles.emptyState}>
      <div style={styles.spinner} />
      <p style={{ margin: 0 }}>Loading daily transaction data...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={styles.emptyState}>
      <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>Could not load daily transaction data</p>
      <p style={{ margin: 0 }}>{message}</p>
      <button type="button" onClick={onRetry} style={styles.retryButton}>
        Retry
      </button>
    </div>
  );
}

function formatReportDate(reportDate) {
  if (!reportDate) return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const parsed = new Date(reportDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(reportDate);
  }

  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DailyTransactionRep({
  transactions = [],
  companyName = "",
  branchName = "",
  reportNo = "",
  reportDate = "",
  isLoading = false,
  error = "",
  onRetry,
  maxHeight = "calc(100vh - 160px)",
  title = "Daily Transaction Report",
}) {
  console.log("[DTR][DailyTransactionRep] received props", {
    transactionsCount: transactions.length,
    companyName,
    branchName,
    reportNo,
    reportDate,
    sample: transactions.slice(0, 5),
  });

  const model = useMemo(() => {
    const result = buildReportModel(transactions);
    console.log("[DTR][DailyTransactionRep] model summary", {
      flattenedCount: result.flattened.length,
      orderedDurations: result.orderedDurations,
      groupedKeys: [...result.grouped.keys()],
      sectionTotals: [...result.sectionTotals.entries()],
      subtotalKeys: [...result.subtotalBySectionType.keys()],
      grandTotal: result.grandTotal,
    });
    return result;
  }, [transactions]);
  const formattedReportDate = useMemo(() => formatReportDate(reportDate), [reportDate]);

  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < model.flattened.length; i += ROWS_PER_PAGE) {
      chunks.push(model.flattened.slice(i, i + ROWS_PER_PAGE));
    }
    return chunks.length ? chunks : [[]];
  }, [model.flattened]);

  const firstIndexOf = (predicate) => {
    for (let i = 0; i < model.flattened.length; i += 1) {
      if (predicate(model.flattened[i])) return i;
    }
    return -1;
  };

  const totalPages = pages.length + 1;

  if (isLoading) {
    return (
      <div style={styles.container(maxHeight)}>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container(maxHeight)}>
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div style={styles.container(maxHeight)}>
      {pages.map((pageRows, pageIndex) => {
        const globalStartIndex = pageIndex * ROWS_PER_PAGE;

        return (
          <div
            key={`daily-page-${pageIndex}`}
            className="daily-page"
            style={{ ...styles.page, pageBreakAfter: "always" }}
          >
            <div style={styles.header}>
              <div style={styles.companyName}>{companyName}</div>
              <div style={styles.subCompany}>{branchName}</div>
              <div style={styles.title}>{title}</div>
            </div>

            <div style={styles.meta}>
              <div>
                <strong>No:</strong> {reportNo || "-"}
              </div>
              <div>
                <strong>Date:</strong> {formattedReportDate}
              </div>
            </div>

            <hr style={styles.hr} />

            <table style={styles.table}>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={5}>
                      No rows
                    </td>
                  </tr>
                ) : null}

                {pageRows.map((row, idxOnPage) => {
                  const globalIndex = globalStartIndex + idxOnPage;

                  if (row.type === "section") {
                    const firstSecIdx = firstIndexOf((x) => x.type === "section" && x.title === row.title);
                    const continued = firstSecIdx < globalIndex;
                    return (
                      <tr key={`sec-${globalIndex}`}>
                        <td style={styles.sectionCell} colSpan={5}>
                          <strong>
                            {row.title}
                            {continued ? " (cont.)" : ""}
                          </strong>
                          <hr />
                        </td>
                      </tr>
                    );
                  }

                  if (row.type === "customer") {
                    const firstCustIdx = firstIndexOf(
                      (x) => x.type === "customer" && x.title === row.title && x.parent === row.parent
                    );
                    const continued = firstCustIdx < globalIndex;
                    return (
                      <tr key={`cust-${globalIndex}`}>
                        <td style={styles.customerCell} colSpan={5}>
                          <em>
                            {row.title}
                            {continued ? " (cont.)" : ""}
                          </em>
                        </td>
                      </tr>
                    );
                  }

                  if (row.type === "custHeader") {
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
                        <td style={styles.td}>{isGuestRow ? "" : row.memNo}</td>
                        <td style={styles.tdLeft}>{row.name}</td>
                        <td style={styles.tdRight}>{fmt(row.price)}</td>
                      </tr>
                    );
                  }

                  if (row.type === "subtotal") {
                    return (
                      <tr key={`sub-${row.section}-${row.customer}-${globalIndex}`}>
                        <td colSpan={4} style={styles.subtotalCell}></td>
                        <td style={styles.subtotalRight}>
                          <div style={styles.subtotalLine} />
                          <div style={styles.subtotalAmount}>{fmt(row.subtotal)}</div>
                        </td>
                      </tr>
                    );
                  }

                  return null;
                })}
              </tbody>
            </table>

            <div style={styles.footer}>
              page {pageIndex + 1} of {totalPages}
            </div>
          </div>
        );
      })}

      <div className="daily-page totals-page" style={{ ...styles.page }}>
        <div style={styles.header}>
          <div style={styles.companyName}>{companyName}</div>
          <div style={styles.subCompany}>{branchName}</div>
          <div style={styles.title}>{title} — Totals</div>
        </div>

        <div style={styles.meta}>
          <div>
            <strong>No:</strong> {reportNo || "-"}
          </div>
          <div>
            <strong>Date:</strong> {formattedReportDate}
          </div>
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
            {model.orderedDurations.map((duration, secIndex) => {
              const typeMap = model.grouped.get(duration) || new Map();
              const orderedTypes = [
                ...TYPE_ORDER.filter((type) => typeMap.has(type)),
                ...[...typeMap.keys()].filter((type) => !TYPE_ORDER.includes(type)).sort(),
              ];
              const rowSpanCount = orderedTypes.length || 1;
              const sectionTotal = model.sectionTotals.get(duration) || 0;

              return (
                <React.Fragment key={`totblock-${duration}-${secIndex}`}>
                  {orderedTypes.map((type, i) => {
                    const custAmount = model.subtotalBySectionType.get(`${duration}::${type}`) || 0;
                    return (
                      <tr key={`${duration}-${type}-${i}`}>
                        {i === 0 ? (
                          <td
                            rowSpan={rowSpanCount}
                            style={{ ...styles.td, verticalAlign: "top", fontWeight: 700, paddingTop: 6 }}
                          >
                            {duration}
                          </td>
                        ) : null}

                        <td style={styles.td}>{type}</td>
                        <td style={styles.tdRight}>{fmt(custAmount)}</td>

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

                  <tr key={`sep-${duration}-${secIndex}`}>
                    <td colSpan={2} style={styles.sepCell}></td>
                    <td colSpan={2} style={styles.sepLine}></td>
                  </tr>
                </React.Fragment>
              );
            })}

            <tr>
              <td colSpan={2} style={{ ...styles.td, fontWeight: 700, borderTop: "1px solid rgba(0,0,0,0.15)" }}>
                Grand Total
              </td>
              <td style={{ ...styles.tdRight, fontWeight: 700, borderTop: "1px solid rgba(0,0,0,0.15)" }}>
                {fmt(model.grandTotal)}
              </td>
              <td style={{ ...styles.tdRight, fontWeight: 700, borderTop: "1px solid rgba(0,0,0,0.15)" }}>
                {fmt(model.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={styles.footer}>
          page {totalPages} of {totalPages}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: (maxHeight) => ({
    overflow: "auto",
    maxHeight,
    background: "#f6f6f6",
    padding: 20,
  }),
  page: {
    width: 794,
    height: 1123,
    margin: "0 auto 20px",
    padding: 82,
    background: "#fff",
    boxSizing: "border-box",
    fontFamily: '"Times New Roman", Georgia, serif',
    color: "#222",
    position: "relative",
    overflow: "hidden",
  },
  header: {
    textAlign: "center",
    marginBottom: 6,
  },
  companyName: {
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
    color: "#333",
  },
  custHeaderRow: {
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
  footer: {
    position: "absolute",
    right: 28,
    bottom: 12,
    fontSize: 16,
    color: "#444",
  },
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
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 8,
    color: "#6b7280",
    background: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "4px solid #d1d5db",
    borderTopColor: "#1A318C",
    animation: "spin 1s linear infinite",
  },
  retryButton: {
    marginTop: 8,
    border: "none",
    borderRadius: 12,
    backgroundColor: "#1A318C",
    color: "#fff",
    padding: "10px 16px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
};
