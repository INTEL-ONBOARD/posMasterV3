import React from "react";
import PropTypes from "prop-types";

/**
 * InventoryRep.jsx (report-styled)
 *
 * - Uses A4-like page styling (width 794px, minHeight 1123px)
 * - Pagination via ROWS_PER_PAGE (keeps pages safe for A4)
 * - Clean header (company + branch + report title)
 * - Compact table styling to match the other report components
 * - Footer area reserved for signatures/notes
 */

const ROWS_PER_PAGE = 18; // safe for A4 portrait (tweak if needed)

const styles = {
  scrollContainer: (maxHeight) => ({
    overflow: "auto",
    maxHeight,
    backgroundColor: "#f6f6f6",
    padding: 20,
  }),

  page: {
    width: "794px", // A4 width @ 96dpi
    minHeight: "1123px", // A4 height @ 96dpi
    margin: "0 auto 20px",
    padding: "32px",
    backgroundColor: "#ffffff",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#222",
    boxSizing: "border-box",
    pageBreakAfter: "always",
    position: "relative",
  },

  header: {
    textAlign: "center",
    marginBottom: 8,
  },

  companySinhala: {
    fontSize: "18px",
    margin: 0,
    fontWeight: 700,
  },
  branch: {
    fontSize: "13px",
    marginTop: 4,
    color: "#444",
  },
  reportTitle: {
    fontSize: "16px",
    marginTop: 6,
    fontWeight: 700,
  },

  metaRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    fontSize: "12px",
    marginBottom: "10px",
    alignItems: "center",
  },

  divider: {
    margin: "12px 0",
    border: "none",
    borderTop: "1px solid #ddd",
  },

  tableWrapper: {
    marginTop: 6,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    color: "#333",
  },

  theadTh: {
    backgroundColor: "#444",
    color: "#fff",
    padding: "8px",
    textAlign: "left",
    fontSize: "11px",
  },

  td: {
    padding: "8px",
    borderBottom: "1px solid #eee",
    fontSize: "12px",
    verticalAlign: "middle",
  },

  tdCenter: {
    textAlign: "center",
  },

  tdRight: {
    textAlign: "right",
  },

  itemName: {
    fontWeight: 700,
    color: "#222",
  },

  mono: {
    fontFamily: "monospace",
  },

  statusBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
    display: "inline-block",
  },

  footerArea: {
    marginTop: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 12,
    color: "#666",
  },

  signatureBlock: {
    display: "flex",
    gap: 24,
    marginTop: 18,
  },

  signatureColumn: {
    width: "180px",
    textAlign: "center",
    fontSize: 12,
  },

  signatureLine: {
    borderBottom: "1px dotted #000",
    height: "20px",
    marginBottom: 6,
  },

  // small spacer reserved for consistent layout when table shorter
  reservedSpace: {
    height: "160px",
  },
};

/* ===================== Helpers ===================== */
const paginateItems = (items, rowsPerPage) => {
  const pages = [];
  for (let i = 0; i < items.length; i += rowsPerPage) {
    pages.push(items.slice(i, i + rowsPerPage));
  }
  return pages.length ? pages : [[]];
};

/* ===================== Component ===================== */
const InventoryRep = React.forwardRef(function InventoryRep(
  {
    items = [],
    getStockStatus = () => ({ text: "N/A" }),
    maxHeight = "calc(100vh - 300px)",
    onRowClick,
    title = "Inventory Status Report",
    subTitle = "Current stock availability overview",
  },
  ref
) {
  const pages = paginateItems(items, ROWS_PER_PAGE);

  return (
    <div style={styles.scrollContainer(maxHeight)}>
      <div ref={ref}>
        {pages.map((pageItems, pageIndex) => {
          const startIndex = pageIndex * ROWS_PER_PAGE;
          const endIndex = startIndex + pageItems.length;

          return (
            <div key={`inventory-page-${pageIndex}`} className="report-page" style={styles.page}>
              {/* Header */}
              <div style={styles.header}>
                <h1 style={styles.companySinhala}>මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමූපකාර සමිතිය</h1>
                <div style={styles.branch}>AllenValley Trade Center</div>
                <div style={styles.reportTitle}>{title}</div>
                {subTitle && <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{subTitle}</div>}
              </div>

              {/* Meta */}
              <div style={styles.metaRow}>
                <div>
                  <div><strong>Report type:</strong> Inventory status</div>
                  <div>
                    <strong>Items:</strong> {startIndex + 1}–{endIndex} of {items.length}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div>
                    <strong>Generated:</strong> {new Date().toLocaleString()}
                  </div>
                  <div>
                    <strong>Page:</strong> {pageIndex + 1} of {pages.length}
                  </div>
                </div>
              </div>

              <hr style={styles.divider} />

              {/* Table */}
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.theadTh}>#</th>
                      <th style={styles.theadTh}>Item Name</th>
                      <th style={styles.theadTh}>SKU</th>
                      <th style={styles.theadTh}>Category</th>
                      <th style={{ ...styles.theadTh, textAlign: "center" }}>Stock</th>
                      <th style={{ ...styles.theadTh, textAlign: "right" }}>Unit Price</th>
                      <th style={{ ...styles.theadTh, textAlign: "right" }}>Total Value</th>
                      <th style={{ ...styles.theadTh, textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageItems.map((item, rowIdx) => {
                      const globalIndex = startIndex + rowIdx;
                      const status = getStockStatus(item);

                      return (
                        <tr
                          key={`${item.id ?? item.sku ?? "inventory-item"}-${globalIndex}`}
                          onClick={() => onRowClick && onRowClick(item)}
                          style={{ cursor: onRowClick ? "pointer" : "default" }}
                        >
                          <td style={styles.td}>{globalIndex + 1}</td>

                          <td style={styles.td}>
                            <div style={styles.itemName}>{item.item_name}</div>
                          </td>

                          <td style={{ ...styles.td, ...styles.mono }}>{item.sku}</td>

                          <td style={styles.td}>{item.category?.type ?? "N/A"}</td>

                          <td style={{ ...styles.td, ...styles.tdCenter }}>
                            {item.quantity ?? 0} {item.uom?.symbol ?? "pcs"}
                          </td>

                          <td style={{ ...styles.td, ...styles.tdRight }}>
                            Rs. {(item.retail_price ?? 0).toLocaleString()}
                          </td>

                          <td style={{ ...styles.td, ...styles.tdRight }}>
                            Rs. {((item.retail_price ?? 0) * (item.quantity ?? 0)).toLocaleString()}
                          </td>

                          <td style={{ ...styles.td, ...styles.tdCenter }}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                backgroundColor:
                                  status.text === "Low Stock"
                                    ? "#fee2e2"
                                    : status.text === "Medium"
                                    ? "#fef3c7"
                                    : "#d1fae5",
                                color:
                                  status.text === "Low Stock"
                                    ? "#b91c1c"
                                    : status.text === "Medium"
                                    ? "#92400e"
                                    : "#065f46",
                              }}
                            >
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* If page has fewer rows, reserve space so footer sits consistently */}
                    {pageItems.length < ROWS_PER_PAGE && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <div style={styles.reservedSpace} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer area */}
              <div style={styles.footerArea}>
                <div>Inventory System · Confidential</div>

                <div>
                  <div style={styles.signatureBlock}>
                    <div style={styles.signatureColumn}>
                      <div style={styles.signatureLine} />
                      Created by
                    </div>
                    <div style={styles.signatureColumn}>
                      <div style={styles.signatureLine} />
                      Inspected by
                    </div>
                    <div style={styles.signatureColumn}>
                      <div style={styles.signatureLine} />
                      Inventory keeper
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

InventoryRep.propTypes = {
  items: PropTypes.array.isRequired,
  getStockStatus: PropTypes.func.isRequired,
  maxHeight: PropTypes.string,
  onRowClick: PropTypes.func,
  title: PropTypes.string,
  subTitle: PropTypes.string,
  footerHeight: PropTypes.string,
};

export default InventoryRep;
