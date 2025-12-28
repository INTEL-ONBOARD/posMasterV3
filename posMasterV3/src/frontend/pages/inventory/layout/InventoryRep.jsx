import React from "react";
import PropTypes from "prop-types";

const styles = {
  scrollContainer: (maxHeight) => ({
    overflow: "auto",
    maxHeight,
    backgroundColor: "#f9fafb",
  }),

  reportWrapper: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },

  header: {
    padding: "24px",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "center",
  },

  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#1f2937",
    margin: 0,
  },

  subTitle: {
    fontSize: "14px",
    color: "#4b5563",
    marginTop: "6px",
  },

  metaSection: {
    padding: "16px 24px",
  },

  metaRow: {
    maxWidth: "960px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#4b5563",
    lineHeight: 1.4,
  },

  tableWrapper: {
    padding: "0 24px 24px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },

  thead: {
    backgroundColor: "#1A318C",
    color: "#ffffff",
  },

  th: {
    padding: "10px 12px",
    textAlign: "left",
    textTransform: "uppercase",
    fontSize: "11px",
    letterSpacing: "0.05em",
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
    color: "#374151",
  },

  tdRight: {
    textAlign: "right",
  },

  tdCenter: {
    textAlign: "center",
  },

  itemName: {
    fontWeight: 600,
    color: "#1f2937",
  },

  muted: {
    color: "#6b7280",
  },

  mono: {
    fontFamily: "monospace",
  },

  statusBadge: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    display: "inline-block",
  },

  footerSpacer: (height) => ({
    height,
    borderTop: "1px dashed #d1d5db",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    color: "#9ca3af",
    margin: "0 24px 24px",
  }),
};

const InventoryRep = React.forwardRef(function InventoryRep(
  {
    items,
    getStockStatus,
    maxHeight = "calc(100vh - 300px)",
    onRowClick,
    title = "Inventory Status Report",
    subTitle = "Current stock availability overview",
    footerHeight = "80px",
  },
  ref
) {
  const totalValue = items.reduce(
    (sum, i) => sum + (i.retail_price || 0) * (i.quantity || 0),
    0
  );

  return (
    <div style={styles.scrollContainer(maxHeight)}>
      {/* Printable area */}
      <div ref={ref} style={styles.reportWrapper}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>{title}</h1>
          {subTitle && <div style={styles.subTitle}>{subTitle}</div>}
        </div>

        {/* Meta / sub-header */}
        <div style={styles.metaSection}>
          <div style={styles.metaRow}>
            <div>
              <div>Report type: Inventory status</div>
              <div>Total items: {items.length}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>Generated: {new Date().toLocaleString()}</div>
              <div>Total value: Rs.{totalValue.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Item Name</th>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Category</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Stock</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Unit Price</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Total Value</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => {
                const status = getStockStatus(item);
                return (
                  <tr
                    key={item.id || index}
                    onClick={() => onRowClick && onRowClick(item)}
                    style={{ cursor: onRowClick ? "pointer" : "default" }}
                  >
                    <td style={styles.td}>{index + 1}</td>

                    <td style={styles.td}>
                      <div style={styles.itemName}>{item.item_name}</div>
                    </td>

                    <td style={{ ...styles.td, ...styles.mono }}>
                      {item.sku}
                    </td>

                    <td style={styles.td}>
                      {item.category?.type || "N/A"}
                    </td>

                    <td style={{ ...styles.td, ...styles.tdCenter }}>
                      {item.quantity || 0} {item.uom?.symbol || "pcs"}
                    </td>

                    <td style={{ ...styles.td, ...styles.tdRight }}>
                      Rs.{item.retail_price || 0}
                    </td>

                    <td style={{ ...styles.td, ...styles.tdRight }}>
                      Rs.
                      {(
                        (item.retail_price || 0) *
                        (item.quantity || 0)
                      ).toLocaleString()}
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
            </tbody>
          </table>
        </div>

        {/* Footer space */}
        <div style={styles.footerSpacer(footerHeight)}>
          Footer space reserved
        </div>
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
