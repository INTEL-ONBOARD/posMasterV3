// // BillContent.jsx
// import React from "react";
// import { useRef } from "react";

// //this invisible component is used to print the bill by using it in off-screen.
// const BillContent = React.forwardRef((props, ref) => (
//   <div ref={ref} className="p-8 bg-white text-black font-sans w-[612px] flex flex-col">
//     {/* header section */}
//     <div className="flex flex-col items-center justify-center">
//       <h1 className="text-2xl font-bold mb-4">ඇලන්වැලි සමූපකාර වෙලදසැල</h1>
//       <h2 className="mb-2">No.91, කොටපල, මාතර</h2>
//       <p>034/4940670</p>
//     </div>
//     <hr className="border-t border-gray-300 my-4" />
//     <div className="flex flex-row justify-between">
//       <div className="flex flex-col">
//         <span>වෙළදාම්පත: {billData.invoiceNo}</span>
//         <span> අයකැමි: {billData.cashier_name}</span>
//         <span>ගෙවීම් ක්‍රමය: {billData.payment_method}</span>
//       </div>
//       <div className="flex flex-col">
//         <span>{billData.date_time}</span>
//         <span>{billData.member_no}</span>
//       </div>
//     </div>
//     <hr className="border-t border-gray-300 my-4" />
//     <table className="w-full table-fixed border-collapse mb-4">
//       <thead>
//         <tr>
//           <th className="border border-transparent p-2 text-left">Item</th>
//           <th className="border border-transparent p-2 w-20 text-right">
//             Quantity
//           </th>
//           <th className="border border-transparent p-2 w-24 text-right">
//             Price
//           </th>
//         </tr>
//       </thead>

//       <tbody>
//         {Array.from({ billData.stock_items }).map((item, index) => (
//           <tr key={index}>
//             <td className="border border-transparent p-2 text-left pr-4">
//               {/* item name */}
//               <div>{item.item_name}</div>
//               {/* unit price */}
//               <div className="ml-10">{item.retail_price}</div>
//             </td>
//             {/* quantity */}
//             <td className="border border-transparent p-2 w-20 text-right">
//               {item.customer_quantity}
//             </td>
//             {/* total price */}
//             <td className="border border-transparent p-2 w-24 text-right">
//               {item.total_price}
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </table>

//     <hr className="border-t border-gray-300 my-4" />
//     {/* footer section should exist in the last page only*/}
//     <div className="flex flex-col p-4">
//       <div className="flex flex-row justify-between">
//         <p>මුළු වටිනකම:</p>
//         {/* total amount */}
//         <p>{billData.totalAmount}</p>
//       </div>
//       <div className="flex flex-row justify-between">
//         <p>මිල අඩු කිරීම්:</p>
//         {/* discount amount */}
//         <p>{(billData.discountAmount).toFixed(2)}</p>
//       </div>
//       <div className="flex flex-row justify-between">
//         <p>එකතුව: </p>
//         {/* toatl after discount */}
//         <p>{(billData.finalAmount).toFixed(2)}</p>
//       </div>
//       <hr className="border-t border-gray-300 my-4" />
//       <div className="flex flex-row justify-between">
//         <p>ගෙවූ මුදල:</p>
//         <p>{(billData.cashAmount).toFixed(2)}</p>
//       </div>
//       <div className="flex flex-row justify-between">
//         <p>ඉතිරි මුදල:</p>
//         <p>{(billData.changeAmount).toFixed(2)}</p>
//       </div>
//     </div>
//     <hr className="border-t border-gray-300 my-4" />
//   </div>
// ));

// export default BillContent;


// BillContent.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * BillContent - off-screen printable bill component
 * Accepts a plain object `billData` via props and forwards ref for printing.
 */
const BillContent = React.forwardRef(({ billData = {} }, ref) => {
  // Ensure stock_items is an array
  const items = Array.isArray(billData.stock_items) ? billData.stock_items : [];

  // Safe formatter for numeric values (returns "0.00" for invalid values)
  const fmt = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  };

  return (
    <div
      ref={ref}
      className="p-8 bg-white text-black font-sans w-[612px] flex flex-col"
    >
      {/* header section */}
      <div className="flex flex-col items-center justify-center">
        {/* header */}
        <h1 className="text-md font-bold mb-4">මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමූපකාර සමිතිය</h1>
        <h1 className="text-sm font-bold mb-4">ටී කෝප් ඇලන් වැලි ට්‍රේඩ් සෙන්ටර්</h1>
        <h2 className="mb-2">වෙළදාම්පත</h2>
        {/* <p>034/4940670</p> */}
      </div>

      <hr className="border-t border-gray-300 my-4" />

      <div className="flex flex-row justify-between">
        <div className="flex flex-col">
          <span>ඉන්වොයිස් අංකය: {billData.invoiceNo ?? ""}</span>
          <span>අයකැමි: {billData.cashier_name ?? ""}</span>
          <span>ගෙවීම් ක්‍රමය: {billData.payment_method ?? ""}</span>
        </div>
        <div className="flex flex-col">
          <span>{billData.date_time ?? ""}</span>
          <span>{billData.member_no ?? ""}</span>
        </div>
      </div>

      <hr className="border-t border-gray-300 my-4" />

      {/* Table: item name | retail price | quantity | total price */}
      <table className="w-full table-fixed border-collapse border-black mb-4">
        <thead>
          <tr><th className="border border-transparent p-2 text-sm text-left">ද්‍රව්‍ය</th><th className="border border-transparent p-2 text-sm w-40 text-right">ඒකක මිල</th><th className="border border-transparent p-2 text-sm w-20 text-right">ප්‍රමාණය</th><th className="border border-transparent p-2 text-sm w-24 text-right">මුළු මිල</th></tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || item.stock_id || `${item.item_id}-${item.batch_code}-${index}`}><td className="border border-transparent p-2 text-left pr-4"><div>{item.item_name ?? ""}</div></td><td className="border border-transparent p-2 w-20 text-right">{fmt(item.retail_price)}</td><td className="border border-transparent p-2 w-20 text-right">{item.customer_quantity ?? ""}</td><td className="border border-transparent p-2 w-24 text-right">{fmt(item.total_price)}</td></tr>
          ))}
        </tbody>
      </table>

      <hr className="border-t border-gray-300 my-4" />

      <div className="flex flex-col p-4">
        <div className="flex flex-row justify-between">
          <p>එකතුව::</p>
          <p>{fmt(billData.totalAmount)}</p>
        </div>

        <div className="flex flex-row justify-between">
          <p>වට්ටම්:</p>
          <p>{fmt(billData.discountAmount)}</p>
        </div>

        <div className="flex flex-row justify-between">
          <p>මුළු වටිනකම:: </p>
          <p>{fmt(billData.finalAmount)}</p>
        </div>

        <hr className="border-t border-gray-300 my-4" />

        <div className="flex flex-row justify-between">
          <p>ගෙවූ මුදල:</p>
          <p>{fmt(billData.cashAmount)}</p>
        </div>

        <div className="flex flex-row justify-between">
          <p>ඉතිරි මුදල:</p>
          <p>{fmt(billData.changeAmount)}</p>
        </div>
      </div>

      <hr className="border-t border-gray-300 my-4" />

      {/* footer with centered content*/}
      <div className="flex flex-col items-center justify-center text-xs">
        <div>----------------------------------</div>
        <div>ඉහත සදහන් ද්‍රව්‍ය නිවැරදි බව සහතික කරමි</div>
        <div>----------THANK YOU COME AGAIN----------</div>
        <div>POSMaster</div>

      </div>
    </div>
  );
});

BillContent.displayName = "BillContent";

BillContent.propTypes = {
  billData: PropTypes.object,
};

export default BillContent;
