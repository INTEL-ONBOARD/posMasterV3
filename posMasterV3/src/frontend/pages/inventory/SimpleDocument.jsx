// import { Document, Page, Text, Image, StyleSheet } from '@react-pdf/renderer';

// const styles = StyleSheet.create({
//   page: {
//     flexDirection: 'column',
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 30,
//     backgroundColor: '#fff'
//   },
//   text: {
//     fontSize: 14,
//     marginBottom: 20
//   },
//   barcode: {
//     width: 200,
//     height: 100
//   }
// });

// const SimpleDocument = ({ barcodeDataUrl }) => (
//   <Document>
//     <Page size="A4" style={styles.page}>
//       {barcodeDataUrl && (
//         <Image 
//           style={styles.barcode} 
//           src={barcodeDataUrl} 
//         />
//       )}
//     </Page>
//   </Document>
// );

// export default SimpleDocument;

import { Document, Page, View, Image, Text, StyleSheet } from '@react-pdf/renderer';

// Create styles
const _styles1 = StyleSheet.create({
  page: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#fff'
  },
  barcodeContainer: {
    width: '20%',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // Add dashed border properties
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#999',
    // Optional: add margin to prevent border overlap
    margin: 1
  },
  barcodeImage: {
    width: 100,
    height: 50,
    marginBottom: 2
  },
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#fff'
  },
  barcodeContainer: {
    width: '20%',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
        // Add dashed border properties
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#999',
  },
  barcodeImage: {
    width: 100,
    height: 50,
    marginBottom: 2
  },
});


const SimpleDocument = ({ barcodeDataUrl }) => {
  // Create 12 barcodes (3x4 grid on A4 page)
  const barcodes = Array(55).fill(0);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {barcodes.map((_, index) => (
          <View key={index} style={styles.barcodeContainer}>
            <Image 
              style={styles.barcodeImage} 
              src={barcodeDataUrl} 
            />
          </View>
        ))}
      </Page>
    </Document>
  );
};

export default SimpleDocument;
