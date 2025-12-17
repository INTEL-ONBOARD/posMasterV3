import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";

export default function TransactionHistory({ isActive }) {
  //left section controls
  const [openTransactionFormBlock, setopenTransactionFormBlock] = useState("item");
  const [formDataTransaction, setFormDataTransaction] = useState("item");
  const handleTransactionInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormStockData((prev) => ({ ...prev, [name]: value }));
  };
  return (
    <div className="grid grid-cols-[24rem_1fr_25rem] h-screen bg-gray-300 gap-1">
      {/* Left panel */}
      <div className="bg-gray-300 h-full pl-1 z-10">
        <div className="flex flex-col gap-3">
          {/* ▼ item description block ▼ */}
          <div className="border rounded bg-white">
            <button
              onClick={() => setopenTransactionFormBlock("item")}
              className="w-full flex justify-between items-center bg-white px-1 py-1 text-sm font-bold"
            >
              <span className="text-gray-400">TRANSACTION DESCIRPTION</span>
              {openTransactionFormBlock == "item" ? (
                <ChevronUp />
              ) : (
                <ChevronDown />
              )}
            </button>
            {openTransactionFormBlock == "item" && (
              <div className="px-2 bg h-auto bg-white">
                {/*stock description block  */}
                <div className="flex flex-col gap-2 pb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Batch Code
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formDataTransaction.sku}
                      onChange={handleTransactionInputChange}
                      placeholder=""
                      className="w-full px-2 py-1 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Payment Type
                      </label>
                      <select
                        name="availability"
                        value={formDataTransaction.availability}
                        onChange={handleTransactionInputChange}
                        className="w-full px-2 py-1 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select availability --</option>
                        <option value={true}>Available</option>
                        <option value={false}>Unavailable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Payment Duration
                      </label>
                      <select
                        name="availability"
                        value={formDataTransaction.availability}
                        onChange={handleTransactionInputChange}
                        className="w-full px-2 py-1 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select availability --</option>
                        <option value={true}>Available</option>
                        <option value={false}>Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-row justify-end mt-6">
                    <button
                      /*onClick={handleSearchClick}*/ className="flex items-center px-3 py-1 bg-[#1A318C] text-white w-[10rem]"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"
                        />
                      </svg>
                      Search
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle panel */}
      <div className="bg-white h-full p-4">
        {/* Main search container */}
        <div className="flex flex-row gap-6">
          {/* left */}
          <div className="w-2/3">
            <div>
              <p className="text-sm">Customer Name</p>
              <p className="font-semibold text-lg">
                Nimal Gamage Rathnayake/Member
              </p>
            </div>
            {/* income details */}
            <div className="bg-[#E2E2E2] flex items-center justify-around border-black p-4 mr-8 mt-5">
              <div className="text-center">
                <div className="text-lg font-bold">RS. 20000</div>
                <div className="text-sm font-bold text-gray-600">INCOME</div>
              </div>
              {/* vertical divider */}
              <div
                role="separator"
                aria-orientation="vertical"
                className="w-px h-12 bg-white"
              />
              <div className="text-center">
                <div className="text-lg font-semibold text-[#8F8F8F]">RS. 20000</div>
                <div className="text-sm font-semibold text-[#8F8F8F]">CREDITS</div>
              </div>
            </div>
          </div>
          {/* right */}
          <div className="w-1/3 flex flex-col gap-3">
            <div>
              <p className="text-sm">Date</p>
              <p className="font-semibold text-lg">2025-08-02</p>
            </div>
          </div>
        </div>

        {/* horizontal divider */}
        <div
          role="separator"
          aria-orientation="horizontal"
          className="w-full h-px bg-gray-200 mt-5 mb-2"
        />

        {/* transaction main table */}
        <table className="w-full min-w-[500px]">
          <thead className="bg-gray-700 text-white">
            <tr>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">

              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                Date
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                Payment Type
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                Payment Duration
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                Retail Price
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                Retail Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {/* {selectedItems.map((item, index) => ( */}
            <tr
              // key={item.id}
              className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
            // onClick={() => handleTableRowClick(item)}
            >
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {index+1} */}1
              </td>
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {item.code} */}2025-05-02
              </td>
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {item.quantity || 30}(pcs) */}Cash
              </td>
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {item.total.toFixed(2)} */}06-months
              </td>
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {item.total.toFixed(2)} */}12 500.00
              </td>
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {item.total.toFixed(2)} */}12 500.00
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Right panel */}
      <div className="bg-white h-full flex flex-col pr-5">
        <div className="w-full p-4 bg-white sticky top-0 z-10">
          {/* Main search container */}
          <div className="flex flex-row gap-6">
            {/* left */}
            <div className="w-1/2 flex flex-col gap-3">
              <div>
                <p className="text-sm">Payment Method</p>
                <p className="font-semibold text-lg">Credit (06 Months)</p>
              </div>
              <div>
                <p className="text-sm">Cashier</p>
                <p className="font-semibold text-lg">Namal</p>
              </div>
            </div>
            {/* right */}
            <div className="w-1/2 flex flex-col gap-3">
              <div>
                <p className="text-sm">Date</p>
                <p className="font-semibold text-lg">2025-02-20</p>
              </div>
              <div>
                <p className="text-sm">Invoice No</p>
                <p className="font-semibold text-lg">RECP23213</p>
              </div>
            </div>
          </div>
        </div>

        {/* horizontal divider */}
        <div
          role="separator"
          aria-orientation="horizontal"
          className="w-full h-px bg-gray-200 mt-11"
        />

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <table className="w-full min-w-auto h-auto">
            <thead className="bg-gray-700 text-white">
              <tr>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                  
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                  Item code
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                  Unit count
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">1</td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">XLR9590565</td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">30(pcs)</td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">12 300.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amounts - fixed at bottom */}
        <div className="w-full grid grid-cols-2 p-4 bg-white sticky bottom-0 z-10 shadow mb-6">

          <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base text-gray-500">
            Discount Amount
          </div>
          <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base font-normal text-gray-800 text-right">
            RS.1000
          </div>
          <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-white">
            Total Amount
          </div>
          <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base font-semibold text-white text-right">
            RS.19000
          </div>
          <div className="p-2 bg-[#2D2C2C] text-sm lg:text-base text-white h-16">
            Customer Gave
          </div>
          <div className="p-2 bg-[#2D2C2C] text-lg lg:text-2xl font-semibold text-white text-right h-16">
            RS.20000
          </div>
          <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base text-gray-500">
            Change Amount
          </div>
          <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base font-normal text-gray-800 text-right">
            RS.1000
          </div>

          {/* Button - positioned bottom right */}
          <div className="col-span-2 flex justify-end mt-2">
            <button
              className="flex items-center px-4 py-2 bg-[#1A318C] text-white shadow hover:bg-[#0f2366] transition"
            >
              <svg
                className="w-4 h-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              View Receipt
            </button>
          </div>
        </div>

      </div>

    </div>
  );

}
