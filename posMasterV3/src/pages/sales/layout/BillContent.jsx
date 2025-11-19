// BillContent.jsx
import React from "react";
import { useRef } from "react";

//this invisible component is used to print the bill by using it in off-screen.
const BillContent = React.forwardRef((props, ref) => (
  <div ref={ref} className="p-8 bg-white text-black font-sans w-[612px] flex flex-col">
    {/* header section */}
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">ඇලන්වැලි සමූපකාර වෙලදසැල</h1>
      <h2 className="mb-2">No.91, කොටපල, මාතර</h2>
      <p>034/4940670</p>
    </div>
    <hr className="border-t border-gray-300 my-4" />
    <div className="flex flex-row justify-between">
      <div className="flex flex-col">
        <span>වෙළදාම්පත: XL323434234</span>
        <span> අයකැමි: Namal</span>
        <span>ගෙවීම් ක්‍රමය: ණයට</span>
      </div>
      <div className="flex flex-col">
        <span>වෙළදාම්පත: XL323434234</span>
        <span> අයකැමි: Namal</span>
      </div>
    </div>
    <hr className="border-t border-gray-300 my-4" />
    <table className="w-full table-fixed border-collapse mb-4">
      <thead>
        <tr>
          <th className="border border-transparent p-2 text-left">Item</th>
          <th className="border border-transparent p-2 w-20 text-right">
            Quantity
          </th>
          <th className="border border-transparent p-2 w-24 text-right">
            Price
          </th>
        </tr>
      </thead>

      <tbody>
        {Array.from({ length: 20 }).map((_, index) => (
          <tr key={index}>
            <td className="border border-transparent p-2 text-left pr-4">
              <div>Product 0{index + 1}</div>
              <div className="ml-10">100(pcs)</div>
            </td>

            <td className="border border-transparent p-2 w-20 text-right">
              {index + 1}
            </td>
            <td className="border border-transparent p-2 w-24 text-right">
              ${(index + 1) * 10}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <hr className="border-t border-gray-300 my-4" />
    {/* footer section should exist in the last page only*/}
    <div className="flex flex-col p-4">
      <div className="flex flex-row justify-between">
        <p>මුළු වටිනකම:</p>
        <p>3,558.00</p>
      </div>
      <div className="flex flex-row justify-between">
        <p>එකතුව: </p>
        <p>3,558.00</p>
      </div>
      <hr className="border-t border-gray-300 my-4" />
      <div className="flex flex-row justify-between">
        <p>ගෙවූ මුදල:</p>
        <p>3,558.00</p>
      </div>
      <div className="flex flex-row justify-between">
        <p>ඉතිරි මුදල:</p>
        <p>3,558.00</p>
      </div>
    </div>
    <hr className="border-t border-gray-300 my-4" />
  </div>
));

export default BillContent;