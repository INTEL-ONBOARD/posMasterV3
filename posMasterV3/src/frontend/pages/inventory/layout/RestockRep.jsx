import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, RefreshCw, FileText } from "lucide-react";

const ROWS_PER_PAGE = 12;

const styles = {
  scrollContainer: (maxHeight) => ({
    overflow: "auto",
    maxHeight,
    backgroundColor: "#f9fafb",
    padding: 20,
  }),
  page: {
    width: "794px",
    minHeight: "1123px",
    margin: "0 auto 24px",
    padding: "32px",
    backgroundColor: "#ffffff",
    fontFamily: "Arial, sans-serif",
    color: "#333",
    boxSizing: "border-box",
    pageBreakAfter: "always",
    position: "relative",
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
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "8px",
    color: "#6b7280",
  },
  errorCard: {
    border: "1px solid #fecaca",
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
  },
  retryButton: {
    marginTop: "16px",
    border: "none",
    borderRadius: "12px",
    backgroundColor: "#1A318C",
    color: "#fff",
    padding: "10px 16px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value) => `Rs. ${toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

function getSupplierName(transaction = {}) {
  const supplierValue = transaction?.supplier;

  return (
    transaction?.supplier_name ||
    transaction?.supplierName ||
    supplierValue?.basic_info?.supplier_name ||
    supplierValue?.supplier_name ||
    supplierValue?.name ||
    (typeof supplierValue === "string" ? supplierValue : "") ||
    "Unknown Supplier"
  );
}

function getTransactionInvoiceNo(transaction = {}) {
  return (
    transaction.invoice_no ||
    transaction.invoiceNo ||
    transaction.bill_no ||
    transaction.billNo ||
    transaction.transaction_no ||
    transaction.transactionNo ||
    "N/A"
  );
}

function getTransactionDate(transaction = {}) {
  return (
    transaction.created_at ||
    transaction.createdAt ||
    transaction.updated_at ||
    transaction.updatedAt ||
    transaction.date ||
    null
  );
}

function getTransactionReference(transaction = {}) {
  const raw = transaction.index_value ?? transaction.index ?? transaction.id ?? transaction._id ?? "";
  return raw ? String(raw) : "N/A";
}

function getPaymentMethod(transaction = {}) {
  return transaction.payment_method || transaction.paymentMethod || "cash";
}

function normalizeSectionItem(item = {}, section = "restocked") {
  const quantity = toNumber(item.quantity ?? item.qty ?? item.requested_qty ?? item.requestedQty);
  const stockPrice = toNumber(item.stock_price ?? item.stockPrice ?? item.unit_price ?? item.unitPrice);
  const retailPrice = toNumber(item.retail_price ?? item.retailPrice ?? item.total_price ?? item.totalPrice);
  const stockTotal = toNumber(item.stock_total ?? item.stockTotal, stockPrice * quantity);
  const retailTotal = toNumber(item.retail_total ?? item.retailTotal, retailPrice * quantity);

  return {
    ...item,
    section,
    quantity,
    stock_price: stockPrice,
    retail_price: retailPrice,
    stock_total: stockTotal,
    retail_total: retailTotal,
    sku: item.sku ?? item.item_sku ?? item.itemSku ?? "N/A",
    batch_code: item.batch_code ?? item.batchCode ?? item.batch ?? item.batch_no ?? item.batchNo ?? "N/A",
    expiry_date: item.expiry_date ?? item.exp_date ?? item.expiryDate ?? item.expiry ?? null,
    description: item.description ?? item.reason ?? "",
  };
}

function normalizeTransaction(transaction = {}, index = 0) {
  const addedItemsSource = Array.isArray(transaction.addedItems)
    ? transaction.addedItems
    : Array.isArray(transaction.added_items)
      ? transaction.added_items
      : [];
  const returnItemsSource = Array.isArray(transaction.returnItems)
    ? transaction.returnItems
    : Array.isArray(transaction.return_items)
      ? transaction.return_items
      : [];

  const addedItems = addedItemsSource.map((item) => normalizeSectionItem(item, "restocked"));
  const returnItems = returnItemsSource.map((item) => normalizeSectionItem(item, "returned"));

  return {
    ...transaction,
    id: transaction.id ?? transaction._id ?? null,
    invoice_no: getTransactionInvoiceNo(transaction),
    supplier_name: getSupplierName(transaction),
    supplier_id: transaction.supplier_id ?? transaction.supplierId ?? transaction.sup_id ?? null,
    reference: getTransactionReference(transaction),
    created_at: getTransactionDate(transaction),
    payment_method: getPaymentMethod(transaction),
    discount: toNumber(transaction.discount ?? transaction.discountAmount),
    cashAmount: toNumber(transaction.cashAmount ?? transaction.cash_amount),
    changeAmount: toNumber(transaction.changeAmount ?? transaction.change_amount),
    totalAmount: toNumber(transaction.totalAmount ?? transaction.total_amount),
    addedItems,
    returnItems,
  };
}

function getItemLineTotal(item = {}, section = "restocked") {
  const quantity = Math.abs(toNumber(item.quantity));
  const stockPrice = toNumber(
    item.stock_price ??
      item.stockPrice ??
      item.unit_price ??
      item.unitPrice ??
      0
  );
  const retailPrice = toNumber(
    item.retail_price ??
      item.retailPrice ??
      item.unit_price ??
      item.unitPrice ??
      item.total_price ??
      item.totalPrice ??
      0
  );

  if (section === "returned") {
    return toNumber(item.stock_total ?? item.stockTotal ?? item.retail_total ?? item.retailTotal, quantity * stockPrice);
  }

  return toNumber(item.stock_total ?? item.stockTotal, quantity * stockPrice);
}

function buildPages(transactions = []) {
  const pages = [];

  transactions.forEach((transaction, transactionIndex) => {
    const restocked = transaction.addedItems.map((item) => ({ ...item, section: "restocked" }));
    const returned = transaction.returnItems.map((item) => ({ ...item, section: "returned" }));
    const rows = [...restocked, ...returned];
    const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
      const start = pageIndex * ROWS_PER_PAGE;
      const pageItems = rows.slice(start, start + ROWS_PER_PAGE);
      pages.push({
        transaction,
        transactionIndex,
        pageIndex,
        totalPages,
        pageItems,
        isLastPage: pageIndex === totalPages - 1,
      });
    }
  });

  return pages;
}

function LoadingState() {
  return (
    <div style={styles.emptyState}>
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C]" />
      <p>Loading restock data...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={styles.errorCard}>
      <div className="flex items-start gap-4">
        <div style={{ borderRadius: "16px", backgroundColor: "#fef2f2", color: "#dc2626", padding: "12px" }}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>Could not load restock data</h3>
          <p style={{ marginTop: "6px", color: "#6b7280", fontSize: "14px" }}>{message}</p>
          <button type="button" onClick={onRetry} style={styles.retryButton}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function RestockRep({
  restockData = [],
  isLoading = false,
  error = "",
  onRetry,
  maxHeight = "calc(100vh - 300px)",
  title = "Stock Acceptance Report",
}) {
  const normalizedTransactions = useMemo(
    () => (Array.isArray(restockData) ? restockData : []).map((transaction, index) => normalizeTransaction(transaction, index)),
    [restockData]
  );

  const pages = useMemo(() => buildPages(normalizedTransactions), [normalizedTransactions]);

  if (isLoading) {
    return (
      <div style={styles.scrollContainer(maxHeight)}>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.scrollContainer(maxHeight)}>
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (normalizedTransactions.length === 0) {
    return (
      <div style={styles.scrollContainer(maxHeight)}>
        <div style={styles.emptyState}>
          <FileText className="h-12 w-12 text-gray-300" />
          <h3 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>No restock transactions found</h3>
          <p style={{ margin: 0 }}>There are no acceptance records available for this branch.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.scrollContainer(maxHeight)}>
      <div>
        {pages.map((page, pageIndex) => {
          const {
            transaction,
            transactionIndex,
            pageItems,
            pageIndex: pageNo,
            totalPages,
            isLastPage,
          } = page;

          const pageRestockedTotal = transaction.addedItems.reduce((sum, item) => sum + getItemLineTotal(item, "restocked"), 0);
          const pageReturnedTotal = transaction.returnItems.reduce((sum, item) => sum + getItemLineTotal(item, "returned"), 0);
          const txDiscount = toNumber(transaction.discount);
          const txTotalAmount = toNumber(transaction.totalAmount, pageRestockedTotal - pageReturnedTotal - txDiscount);
          const txCashAmount = toNumber(transaction.cashAmount);
          const txChangeAmount = toNumber(transaction.changeAmount);
          return (
            <div
              key={`restock-page-${transaction.id ?? transaction.reference ?? transactionIndex}-${pageIndex}`}
              className="restock-page"
              style={styles.page}
            >
              <div style={styles.header}>
                <h1 style={styles.company}>මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමුපකාර සමිතිය</h1>
                <div style={styles.subCompany}>Kotapala-Retail</div>
                <h2 style={styles.reportTitle}>{title}</h2>
              </div>

              <div style={styles.metaRow}>
                <div>
                  <div><strong>Invoice No:</strong> {transaction.invoice_no}</div>
                  <div><strong>Supplier:</strong> {transaction.supplier_name || getSupplierName(transaction) || "Unknown Supplier"}</div>
                </div>
                <div>
                  <div><strong>Index:</strong> {transaction.reference}</div>
                  <div><strong>Date:</strong> {formatDate(transaction.created_at)}</div>
                </div>
                <div>
                  <div><strong>Payment:</strong> {String(transaction.payment_method || "cash").toUpperCase()}</div>
                  <div><strong>Page:</strong> {pageNo + 1} of {totalPages}</div>
                </div>
                <div>
                  <div><strong>Restocked Items:</strong> {transaction.addedItems.length}</div>
                  <div><strong>Returned Items:</strong> {transaction.returnItems.length}</div>
                </div>
              </div>

              <hr style={styles.divider} />

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
                    const absoluteIndex = pageNo * ROWS_PER_PAGE + rowIndex;
                    const previousItem = rowIndex > 0 ? pageItems[rowIndex - 1] : null;
                    const showSectionHeading = rowIndex === 0 || !previousItem || previousItem.section !== item.section;
                    const sectionLabel = item.section === "returned" ? "Returned" : "Restocked";
                    const lineQty = Number(
                      item.quantity ??
                        item.unit_count ??
                        item.unitCount ??
                        item.qty ??
                        item.requested_qty ??
                        item.requestedQty ??
                        0
                    ) || 0;
                    const qty = Math.abs(lineQty);
                    const displayQty = item.section === "returned" ? -qty : lineQty;
                    const stockPrice = Number(
                      item.stock_price ??
                        item.stockPrice ??
                        item.unit_price ??
                        item.unitPrice ??
                        (qty ? Number(item.stock_total ?? item.stockTotal ?? 0) / qty : 0) ??
                        0
                    ) || 0;
                    const retailPrice = Number(
                      item.retail_price ??
                        item.retailPrice ??
                        item.price ??
                        item.unit_price ??
                        item.unitPrice ??
                        item.total_price ??
                        item.totalPrice ??
                        (qty ? Number(item.retail_total ?? item.retailTotal ?? 0) / qty : 0) ??
                        0
                    ) || 0;
                    const stockTotal = qty * stockPrice;
                    const retailTotal = qty * retailPrice;

                    if (item.section === "returned") {
                      console.log("Returned Item Data:", item);
                    }

                    return (
                      <React.Fragment key={`${item.section}-${item.sku}-${item.batch_code}-${absoluteIndex}`}>
                        {showSectionHeading ? (
                          <tr>
                            <td style={styles.sectionRow} colSpan={7}>
                              {sectionLabel}
                            </td>
                          </tr>
                        ) : null}

                        <tr>
                          <td style={styles.td}>{absoluteIndex + 1}</td>
                          <td style={styles.td}>{item.sku}</td>
                          <td style={styles.td}>{displayQty}</td>
                          <td style={styles.td}>{formatCurrency(stockPrice)}</td>
                          <td style={styles.td}>{formatCurrency(stockTotal)}</td>
                          <td style={styles.td}>{formatCurrency(retailPrice)}</td>
                          <td style={styles.td}>{formatCurrency(retailTotal)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {isLastPage ? (
                <>
                  <div style={styles.summary}>
                    <div style={styles.summaryRow}>
                      <span>Restocked</span>
                      <span>{formatCurrency(pageRestockedTotal)}</span>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Returned</span>
                      <span>{formatCurrency(pageReturnedTotal)}</span>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Discount</span>
                      <span>{formatCurrency(txDiscount)}</span>
                    </div>
                    <div style={{ ...styles.summaryRow, ...styles.total }}>
                      <span>Total Amount</span>
                      <span>{formatCurrency(txTotalAmount)}</span>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Cash Amount</span>
                      <span>{formatCurrency(txCashAmount)}</span>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Change Amount</span>
                      <span>{formatCurrency(txChangeAmount)}</span>
                    </div>
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
                <div style={{ height: "220px" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

RestockRep.propTypes = {
  restockData: PropTypes.array,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  maxHeight: PropTypes.string,
  title: PropTypes.string,
  subTitle: PropTypes.string,
};

export default RestockRep;
