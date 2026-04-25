import React from 'react';

/**
 * SalesReportB5.jsx
 * Updated: last column (Office use only) contains the requested 8-row structure.
 * - JavaScript React single-file component
 * - First table: 10 columns, 8 rows
 * - Office-use column for rows 1-4 shows simple labels
 * - Office-use column for rows 5-8 contains an embedded 3-column area (header + 3 rows)
 *
 * Use: paste into a React app and render <SalesReportB5 />.
 */

export default function TransactionB5Rep() {
  // data rows; we keep textual values for clarity
  const rows = [
    { description: 'Cash today', totalSales: '25,380.00', bop: '40,114.76', memberCredit: '17,000.00', staffCredit: '', threeMonthMaure: '0.00', monthlyManure: '0.00', longTermCredit: '', creditTotal: '25,380.00' },
    { description: 'Deposited credit today', totalSales: '152,347.60', bop: '', memberCredit: '', staffCredit: '', threeMonthMaure: '', monthlyManure: '', longTermCredit: '', creditTotal: '152,347.60' },
    { description: '', totalSales: '', bop: '', memberCredit: '', staffCredit: '', threeMonthMaure: '', monthlyManure: '', longTermCredit: '', creditTotal: '' },
    { description: '', totalSales: '', bop: '', memberCredit: '', staffCredit: '', threeMonthMaure: '', monthlyManure: '', longTermCredit: '', creditTotal: '' },
    // rows 5-8: special subtotal block (we will still feed description/values normally)
    { description: '', totalSales: '', bop: '', memberCredit: '', staffCredit: '', threeMonthMaure: '', monthlyManure: '', longTermCredit: '', creditTotal: '' },
    { description: 'Total today', totalSales: '177,727.60', bop: '', memberCredit: '', staffCredit: '', threeMonthMaure: '', monthlyManure: '', longTermCredit: '', creditTotal: '177,727.60' },
    { description: 'Total previous day', totalSales: '55,104.03', bop: '', memberCredit: '', staffCredit: '', threeMonthMaure: '', monthlyManure: '', longTermCredit: '', creditTotal: '55,104.03' },
    { description: 'Subtotal today', totalSales: '132,623.57', bop: '', memberCredit: '', staffCredit: '', threeMonthMaure: '', monthlyManure: '', longTermCredit: '', creditTotal: '132,623.57' },
  ];

  // Received section: 11 rows
  const receivedRows = [
    { prev: '40,114.76', description: 'Cash sales', date: '25-09-2023', today: '25,380.00' },
    { prev: '', description: '', date: '', today: '' },
    { prev: '', description: '', date: '', today: '' },
    { prev: '', description: 'Empty containers', date: '', today: '' },
    { prev: '', description: 'Other', date: '', today: '' },
    { prev: '', description: 'Total', date: '', today: '' },
    { prev: '', description: 'Remaining', date: '', today: '' },
    { prev: '', description: 'Subtotal', date: '', today: '' },
    { prev: '', description: 'Credits', date: '', today: '' },
    { prev: '', description: '', date: '', today: '' },
    { prev: '', description: '', date: '', today: '' },
  ];

  // Expenses section: 11 rows. Description actually has two internal columns: an "invoice" column
  // (single top-aligned text) and a per-row description column. We'll implement the invoice as a cell
  // with rowSpan=11 in the first row of the expenses table to achieve the top-aligned single text.
  const expensesRows = [
    { prev: '', description: 'Cash', date: '', today: '' },
    { prev: '', description: 'Cheque', date: '', today: '' },
    { prev: '', description: 'Total', date: '', today: '' },
    { prev: '', description: '', date: '', today: '' },
    { prev: '', description: 'Total', date: '', today: '' },
    { prev: '', description: 'Remaining', date: '', today: '' },
    { prev: '', description: 'Subtotal', date: '', today: '' },
    { prev: '', description: '', date: '', today: '' },
    { prev: '', description: '', date: '', today: '' },
    { prev: '', description: '', date: '', today: '' },
    { prev: '', description: '', date: '', today: '' },
  ];

  // helper to render the Office use cell according to row index
  const renderOfficeUse = (rowIndex) => {
    // rows are 0-based; user provided semantics for rows 1..8
    if (rowIndex === 0) return <div style={styles.officeCell}>received date</div>;
    if (rowIndex === 1) return <div style={styles.officeCell}>inspected date</div>;
    if (rowIndex === 2) return <div style={styles.officeCell}>approved date</div>;
    if (rowIndex === 3) return <div style={{ ...styles.officeCell, textAlign: 'center', verticalAlign: 'middle' }}>After Inspection</div>;

    // For rows 5..8 (indices 4..7), render a small 3-column grid inside the office cell.
    // Row 5 (index 4) is the header: [ '', 'Less cash', 'More cash' ]
    // Row 6 (index 5): [ 'Date', '', '' ]
    // Row 7 (index 6): [ 'Previous day', '', '' ]
    // Row 8 (index 7): [ 'Today', '', '' ]

    if (rowIndex >= 4 && rowIndex <= 7) {
      // Define the inner rows dataset based on the overall rowIndex
      const innerRows = [
        ['', 'Less cash', 'More cash'],
        ['Date', '', ''],
        ['Previous day', '', ''],
        ['Today', '', ''],
      ];
      const innerIndex = rowIndex - 4; // 0..3

      // We'll display only the single inner row corresponding to this main rowIndex,
      // but keep the header style for the first inner row (index 0). For rowIndex 4
      // (innerIndex 0) we show the header; for others show the matching inner row.
      const cellData = innerRows[innerIndex];

      return (
        <div style={styles.officeNested}>
          {innerIndex === 0 ? (
            // header style row (smaller font, bold)
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontWeight: 700, fontSize: 11 }}>
              <div style={{ textAlign: 'center' }}>{cellData[0]}</div>
              <div style={{ textAlign: 'center' }}>{cellData[1]}</div>
              <div style={{ textAlign: 'center' }}>{cellData[2]}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 11 }}>
              <div style={{ textAlign: 'center' }}>{cellData[0]}</div>
              <div style={{ textAlign: 'center' }}>{cellData[1]}</div>
              <div style={{ textAlign: 'center' }}>{cellData[2]}</div>
            </div>
          )}
        </div>
      );
    }

    // fallback
    return <div style={styles.officeCell} />;
  };

  return (
    <div style={{ padding: 12, background: '#f4f6f8', minHeight: '100vh' }}>
      <style>{printStyles}</style>

      <div className="report-page" style={styles.page}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.company}>Sample Cooperative Society</div>
            <div style={styles.reportTitle}>Sales Report (B5)</div>
          </div>
          <div style={styles.headerRight}>
            <div><strong>Date:</strong> 25-09-2023</div>
            <div><strong>Form:</strong> 1120</div>
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
                <th style={styles.th}>3 month maure</th>
                <th style={styles.th}>Monthly manure</th>
                <th style={styles.th}>Long-term credit</th>
                <th style={styles.th}>Credit Total</th>
                <th style={styles.th}>Office use only</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td style={styles.tdLeft}>{r.description}</td>
                  <td style={styles.td}>{r.totalSales}</td>
                  <td style={styles.td}>{r.bop}</td>
                  <td style={styles.td}>{r.memberCredit}</td>
                  <td style={styles.td}>{r.staffCredit}</td>
                  <td style={styles.td}>{r.threeMonthMaure}</td>
                  <td style={styles.td}>{r.monthlyManure}</td>
                  <td style={styles.td}>{r.longTermCredit}</td>
                  <td style={styles.td}>{r.creditTotal}</td>

                  {/* Office use column: custom rendering */}
                  <td style={{ ...styles.td, padding: 6 }}>
                    {renderOfficeUse(idx)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Second table: two side-by-side sub-tables (Received | Expenses) */}
        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          {/* Received table */}
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
              {receivedRows.map((row, i) => (
                <tr key={i}>
                  <td style={styles.tdSmall}>{row.prev}</td>
                  <td style={styles.tdLeftSmall}>{row.description}</td>
                  <td style={styles.tdSmall}>{row.date}</td>
                  <td style={styles.tdSmall}>{row.today}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expenses table */}
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
              {expensesRows.map((row, i) => (
                <tr key={i}>
                  <td style={styles.tdSmall}>{row.prev}</td>

                  {/* Invoice cell: render once with rowSpan=11 */}
                  {i === 0 ? (
                    <td style={styles.tdSmall} rowSpan={11}>
                      <div style={{ fontSize: 12, textAlign: 'left', verticalAlign: 'top' }}>
                        Invoice number from money keeper
                      </div>
                    </td>
                  ) : null}

                  <td style={styles.tdLeftSmall}>{row.description}</td>
                  <td style={styles.tdSmall}>{row.date}</td>
                  <td style={styles.tdSmall}>{row.today}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          {/* <div style={styles.footerLeft}>
            <div style={styles.note}><strong>Notes:</strong> Sinhala text replaced with dummy English labels. Empty rows left intentionally.</div>
          </div> */}
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
    background: '#fff',
    padding: 16,
    boxShadow: '0 0 10px rgba(0,0,0,0.08)',
    fontFamily: 'Arial, sans-serif',
    fontSize: 12,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: {},
  headerRight: { textAlign: 'right', fontSize: 11 },
  company: { fontSize: 14, fontWeight: 700 },
  reportTitle: { fontSize: 16, fontWeight: 700, marginTop: 4 },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { border: '1px solid #000', padding: 4, fontWeight: 700, textAlign: 'center' },
  td: { border: '1px solid #000',  padding: 4, textAlign: 'right', verticalAlign: 'top' },
  tdLeft: { border: '1px solid #000', padding: 4, textAlign: 'left', verticalAlign: 'top' },

  officeCell: { minHeight: 22, fontSize: 11 },
  officeNested: { width: '100%' },

  subTable: { width: '50%', borderCollapse: 'collapse' },
  subHeader: { border: '1px solid #000', padding: 6, textAlign: 'center', fontWeight: 700 },
  thSmall: { border: '1px solid #000', padding: 4, textAlign: 'center', fontSize: 11 },
  tdSmall: { border: '1px solid #000', padding: 4, textAlign: 'right', fontSize: 11 },
  tdLeftSmall: { border: '1px solid #000', padding: 4, textAlign: 'left', fontSize: 11 },

  footer: { display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 11 },
  footerLeft: {},
  footerRight: { display: 'flex', gap: 24 },
  note: { maxWidth: 400 },
  sign: { textAlign: 'center' },
  signLine: { width: 120, borderBottom: '1px solid #000', marginBottom: 4 },
};

const printStyles = `
@page { size: A4 landscape; margin: 12mm; }
@media print {
  body * { visibility: visible; }
  .report-page { box-shadow: none !important; margin: 0 !important; }
}
`;
