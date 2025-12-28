import React from "react";

function RestockRep() {
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.company}>මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමූපකාර සමිතිය</h1>
        <div style={styles.subCompany}>Kotapala-Retail</div>
        <h2 style={styles.reportTitle}>Stock Acceptance Report</h2>
      </div>

      {/* Meta Info */}
      <div style={styles.metaRow}>
        <div><strong>Invoice No:</strong> REPC2456XS</div>
        <div><strong>Supplier:</strong> Ranathunga PVT. LTD</div>
        <div><strong>Index:</strong> RPT3244546565</div>
        <div><strong>Date:</strong> 2023-03-02</div>
      </div>

      <hr style={styles.divider} />

      {/* Received Section */}
      <h3 style={styles.sectionTitle}>Received</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Item code</th>
            <th>Unit count</th>
            <th>Stock Price</th>
            <th>Stock Total</th>
            <th>Retail Price</th>
            <th>Retail Total</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i}>
              <td>{i}</td>
              <td>XLR9590565</td>
              <td>30(pcs)</td>
              <td>12,300.00</td>
              <td>12,300.00</td>
              <td>12,500.00</td>
              <td>12,300.00</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Returned Section */}
      <h3 style={styles.sectionTitle}>Returned</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Item code</th>
            <th>Unit count</th>
            <th>Stock Price</th>
            <th>Stock Total</th>
            <th>Retail Price</th>
            <th>Retail Total</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2].map((i) => (
            <tr key={i}>
              <td>{i}</td>
              <td>XLR9590565</td>
              <td>30(pcs)</td>
              <td>2,300.00</td>
              <td>2,300.00</td>
              <td>6,300.00</td>
              <td>2,300.00</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div style={styles.summary}>
        <div><span>Restocked</span><span>121,100.00</span></div>
        <div><span>Returned</span><span>21,700.00</span></div>
        <div><span>Discount</span><span>1,700.00</span></div>
        <div style={styles.total}><span>Total Amount</span><span>112,300.00</span></div>
        <div><span>Cash Amount</span><span>2,300.00</span></div>
        <div><span>Change Amount</span><span>110,000.00</span></div>
      </div>

      {/* Signatures */}
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
    </div>
  );
}

export default RestockRep;

/* ===================== STYLES ===================== */

const styles = {
  page: {
    width: "794px",            // A4 width @ 96dpi
    minHeight: "1123px",       // A4 height @ 96dpi
    margin: "0 auto",
    padding: "40px",
    backgroundColor: "#ffffff",
    fontFamily: "Arial, sans-serif",
    color: "#333",
    boxSizing: "border-box",
  },

  header: {
    textAlign: "center",
    marginBottom: "20px",
  },
  company: {
    fontSize: "18px",
    margin: 0,
  },
  subCompany: {
    fontSize: "14px",
    marginBottom: "8px",
  },
  reportTitle: {
    fontSize: "20px",
    marginTop: "10px",
  },

  metaRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    fontSize: "12px",
    marginBottom: "10px",
  },

  divider: {
    margin: "15px 0",
    border: "none",
    borderTop: "1px solid #ddd",
  },

  sectionTitle: {
    fontSize: "14px",
    margin: "16px 0 6px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    marginBottom: "16px",
  },

  summary: {
    backgroundColor: "#c9c9c9",
    padding: "10px",
    fontSize: "12px",
    marginTop: "10px",
  },

  total: {
    fontWeight: "bold",
  },

  signatures: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginTop: "50px",
    fontSize: "11px",
    textAlign: "center",
  },

  signatureLine: {
    borderBottom: "1px dotted #000",
    marginBottom: "6px",
    height: "20px",
  },
};

/* Table head & cells */
Object.assign(styles.table, {
  th: {
    backgroundColor: "#333",
    color: "#fff",
    padding: "6px",
    textAlign: "center",
  },
  td: {
    padding: "6px",
    borderBottom: "1px solid #eee",
    textAlign: "center",
  },
});
