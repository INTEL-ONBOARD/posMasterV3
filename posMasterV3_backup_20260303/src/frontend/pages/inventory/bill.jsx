// import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

// // Convert cm to points (1cm = 28.35pt)
// const width = 12 * 28.35;
// const height = 9 * 28.35;

// const styles = StyleSheet.create({
//   page: {
//     width: width,
//     height: height,
//     backgroundColor: '#fff',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 10,
//   },
//   text: {
//     fontSize: 16,
//     textAlign: 'center',
//   },
// });

// const Bill = () => (
//   <Document>
//     <Page size={[width, height]} style={styles.page}>
//       <View>
//         <Text style={styles.text}>This is a sample bill</Text>
//       </View>
//     </Page>
//   </Document>
// );

// export default Bill;

// import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

// // Convert cm to points (1cm = 28.35pt)
// const width = 12 * 28.35;
// const height = 9 * 28.35;

// // Calculate cell dimensions
// const cellWidth = width / 12;
// const cellHeight = height / 9;

// const styles = StyleSheet.create({
//   page: {
//     width: width,
//     height: height,
//     backgroundColor: '#fff',
//     padding: 0,
//     borderWidth: 1,
//     borderColor: '#000',
//     borderStyle: 'solid',
//     position: 'relative',
//   },
//   gridContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     width: '100%',
//     height: '100%',
//   },
//   gridRow: {
//     flexDirection: 'row',
//     width: '100%',
//     height: cellHeight,
//   },
//   gridCell: {
//     width: cellWidth,
//     height: '100%',
//     borderRightWidth: 1,
//     borderBottomWidth: 1,
//     borderColor: '#ddd',
//   },
//   centeredContent: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   text: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     backgroundColor: '#fff',  // Ensure text is readable over grid
//     padding: 10,
//   },
// });

// const Bill = () => {
//   // Create grid cells (9 rows x 12 columns)
//   const rows = Array(9).fill(0);
//   const columns = Array(12).fill(0);
  
//   return (
//     <Document>
//       <Page size={[width, height]} style={styles.page}>
//         {/* Grid System */}
//         <View style={styles.gridContainer}>
//           {rows.map((_, rowIndex) => (
//             <View key={rowIndex} style={styles.gridRow}>
//               {columns.map((_, colIndex) => (
//                 <View 
//                   key={`${rowIndex}-${colIndex}`} 
//                   style={[
//                     styles.gridCell,
//                     colIndex === 11 && { borderRightWidth: 0 },  // Remove right border on last column
//                     rowIndex === 8 && { borderBottomWidth: 0 }   // Remove bottom border on last row
//                   ]}
//                 />
//               ))}
//             </View>
//           ))}
//         </View>
        
//         {/* Centered Text */}
//         <View style={styles.centeredContent}>
//           <Text style={styles.text}>This is a sample bill</Text>
//         </View>
//       </Page>
//     </Document>
//   );
// };

// export default Bill;


// import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

// // Swap dimensions: width=9cm, height=12cm
// const width = 9 * 28.35;  // 255.15pt
// const height = 12 * 28.35; // 340.2pt

// // Calculate cell dimensions for 12x9 grid (rows x columns)
// const cellWidth = width / 9;   // 9 columns
// const cellHeight = height / 12; // 12 rows

// const styles = StyleSheet.create({
//   page: {
//     width: width,
//     height: height,
//     backgroundColor: '#fff',
//     padding: 0,
//     borderWidth: 1,
//     borderColor: '#000',
//     borderStyle: 'solid',
//     position: 'relative',
//   },
//   gridContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     width: '100%',
//     height: '100%',
//   },
//   gridRow: {
//     flexDirection: 'row',
//     width: '100%',
//     height: cellHeight,
//   },
//   gridCell: {
//     width: cellWidth,
//     height: '100%',
//     borderRightWidth: 1,
//     borderBottomWidth: 1,
//     borderColor: '#000', // Changed to black
//   },
//   centeredContent: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   text: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     backgroundColor: '#fff',
//     padding: 10,
//   },
// });

// const Bill = () => {
//   // Create grid cells (12 rows x 9 columns)
//   const rows = Array(12).fill(0);
//   const columns = Array(9).fill(0);
  
//   return (
//     <Document>
//       <Page size={[width, height]} style={styles.page}>
//         {/* Grid System - 12 rows x 9 columns */}
//         <View style={styles.gridContainer}>
//           {rows.map((_, rowIndex) => (
//             <View key={rowIndex} style={styles.gridRow}>
//               {columns.map((_, colIndex) => (
//                 <View 
//                   key={`${rowIndex}-${colIndex}`} 
//                   style={[
//                     styles.gridCell,
//                     colIndex === 8 && { borderRightWidth: 0 },  // Remove right border on last column (index 8)
//                     rowIndex === 11 && { borderBottomWidth: 0 }  // Remove bottom border on last row (index 11)
//                   ]}
//                 />
//               ))}
//             </View>
//           ))}
//         </View>
        
//         {/* Centered Text */}
//         <View style={styles.centeredContent}>
//           <Text style={styles.text}>This is a sample bill</Text>
//         </View>
//       </Page>
//     </Document>
//   );
// };

// export default Bill;
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

// Portrait: 10cm × 10cm
const width = 10 * 28.35;   // 283.5pt
const height = 10 * 28.35;  // 283.5pt

const styles = StyleSheet.create({
  page: {
    width,
    height,
    backgroundColor: '#fff',
    padding: 0,
    margin: 0,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    position: 'relative',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text10: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 5,
  },
  text12: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 5,
  },
  text15: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 5,
  },
});

const Bill = () => (
  <Document>
    <Page size={[width, height]} style={styles.page}>
      <Text style={styles.text10}>This is text size 10</Text>
      <Text style={styles.text12}>This is text size 12</Text>
      <Text style={styles.text15}>This is text size 15</Text>
    </Page>
  </Document>
);

export default Bill;
