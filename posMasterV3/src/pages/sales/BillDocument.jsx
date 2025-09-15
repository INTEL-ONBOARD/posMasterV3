import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';

// Register a Sinhala font (place the .ttf file in your project, e.g. ./fonts/NotoSansSinhala-Regular.ttf)
// Use require() if your bundler supports it, otherwise ensure the path points to a public URL or use an import.
let notoSinhalaSrc;
try {
  // Many bundlers (webpack, CRA) allow require of font files
  notoSinhalaSrc = require('./fonts/NotoSansSinhala-Regular.ttf');
} catch (e) {
  // Fallback: reference by relative path (useful for runtime loading or if you copy font to public folder)
  // If your bundler supports ES module imports for assets, you can instead do:
  // import notoSinhalaSrc from './fonts/NotoSansSinhala-Regular.ttf';
  notoSinhalaSrc = './fonts/NotoSansSinhala-Regular.ttf';
}

Font.register({
  family: 'NotoSinhala',
  src: notoSinhalaSrc,
});


// Dummy data (no props)
const shop = {
  name: 'අලුත් ගබඩාව',
  address: 'No.91, කොළඹ, ශ්‍රී ලංකා',
  phone: '035-4940670',
  invoiceNo: 'Kamal/00023',
  date: '2025/07/01 04:53PM',
  cashier: 'POSMaster'
};

const customer = {
  name: 'Namal',
  billNo: 'XL523454234',
};

const items = [
  { desc: 'Eddie Chocolate', unit: '100.00 / 1pcs', qty: 2, lineTotal: 200.0 },
  { desc: 'Red Rice', unit: '420.00 / 100g', qty: 5, lineTotal: 200.0 },
  { desc: 'Coconut oil-100ml', unit: '150.00 / 1pcs', qty: 500, lineTotal: 200.0 },
  { desc: 'Nylon string', unit: '5.00 / 100m', qty: 5000, lineTotal: 1000.0 },
  { desc: 'Bottle water 1L', unit: '120.00 / 1pcs', qty: 1, lineTotal: 120.0 },
  { desc: 'Bread', unit: '60.00 / 1pcs', qty: 2, lineTotal: 120.0 },
];

const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontSize: 8,
    fontFamily: 'NotoSinhala',
    backgroundColor: '#fff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 6,
  },
  shopName: { fontSize: 12, fontWeight: 'bold' },
  small: { fontSize: 7 },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  leftColumn: { flexDirection: 'column' },
  rightColumn: { flexDirection: 'column', alignItems: 'flex-end' },
  hr: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 6 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    paddingBottom: 3,
    marginBottom: 3,
  },
  row: { flexDirection: 'row', paddingVertical: 3, alignItems: 'center' },
  colDesc: { width: '50%', paddingRight: 4, fontSize: 7 },
  colUnit: { width: '20%', textAlign: 'left', fontSize: 7 },
  colQty: { width: '10%', textAlign: 'right', fontSize: 7 },
  colTotal: { width: '20%', textAlign: 'right', fontSize: 7 },
  footerTotals: { flexDirection: 'column', alignItems: 'flex-end', marginTop: 6 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '42%', marginBottom: 3, fontSize: 7 },
  thankYou: { textAlign: 'center', marginTop: 12, fontSize: 7 },
  dashedBox: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#999',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 36,
  },
  smallMuted: { fontSize: 6, color: '#666' },
});

const currency = (v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BillDocument() {
  const subTotal = items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
  const discount = 100.0;
  const tax = 0.0;
  const grandTotal = subTotal - discount + tax;

  return (
    <Document>
      <Page size={[255.12, 255.12]} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.small}>{shop.address}</Text>
          <Text style={styles.small}>{shop.phone}</Text>
        </View>

        <View style={styles.invoiceRow}>
          <View style={styles.leftColumn}>
            <Text style={styles.small}>Bill No: {customer.billNo}</Text>
            <Text style={styles.small}>Customer: {customer.name}</Text>
          </View>
          <View style={styles.rightColumn}>
            <Text style={styles.small}>Date: {shop.date}</Text>
            <Text style={styles.small}>Invoice: {shop.invoiceNo}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colUnit}>Unit</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colTotal}>Total (Rs.)</Text>
        </View>

        {/* Items */}
        {items.map((it, i) => (
          <View style={styles.row} key={i}>
            <Text style={styles.colDesc}>{it.desc}</Text>
            <Text style={styles.colUnit}>{it.unit}</Text>
            <Text style={styles.colQty}>{String(it.qty)}</Text>
            <Text style={styles.colTotal}>{currency(it.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.hr} />

        <View style={styles.footerTotals}>
          <View style={styles.totalsRow}>
            <Text>Sub Total</Text>
            <Text>{currency(subTotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Discount</Text>
            <Text>-{currency(discount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Tax</Text>
            <Text>{currency(tax)}</Text>
          </View>
          <View style={{ ...styles.totalsRow, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 6 }}>
            <Text style={{ fontWeight: 'bold' }}>Grand Total</Text>
            <Text style={{ fontWeight: 'bold' }}>{currency(grandTotal)}</Text>
          </View>
        </View>

        {/* Footer area: barcode placeholder + thank you */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
          <View>
            <View style={styles.dashedBox}>
              <Text style={styles.smallMuted}>BARCODE</Text>
            </View>
            <Text style={styles.smallMuted}>POS: {shop.cashier}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.smallMuted}>Prepared By: {shop.cashier}</Text>
            <Text style={styles.smallMuted}>Contact us: 075 000 000 000</Text>
          </View>
        </View>

        <Text style={styles.thankYou}>--- THANK YOU COME AGAIN ---</Text>
      </Page>
    </Document>
  );
}
