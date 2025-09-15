import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";

export default function TransactionHistory() {
  //left section controls
  const [openTransactionFormBlock, setopenTransactionFormBlock] =
    useState("item");
  const [formDataTransaction, setFormDataTransaction] = useState("item");
  const handleTransactionInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormStockData((prev) => ({ ...prev, [name]: value }));
  };
  return (
    <div className="flex bg-gray-300 w-full h-[calc(100vh-2rem)] relative gap-1">
      {/* form section (left) */}
      <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2 z-10">
        {/* 56 is the correct height */}
        <div className="flex flex-col h-[56rem] gap-3">
          {/* ▼ item description block ▼ */}
          <div className="border rounded bg-white">
            <button
              onClick={() => setopenTransactionFormBlock("item")}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">TRANSACTION DESCIRPTION</span>
              {openTransactionFormBlock == "item" ? (
                <ChevronUp />
              ) : (
                <ChevronDown />
              )}
            </button>
            {openTransactionFormBlock == "item" && (
              <div className="px-4 bg h-[16rem] bg-white">
                {/*stock description block  */}
                <div className="flex flex-col gap-2">
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
                      className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Payment Type
                      </label>
                      <select
                        name="availability"
                        value={formDataTransaction.availability}
                        onChange={handleTransactionInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
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
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select availability --</option>
                        <option value={true}>Available</option>
                        <option value={false}>Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-row justify-end mt-6">
                    <button
                      /*onClick={handleSearchClick}*/ className="flex items-center px-4 py-2 bg-[#1A318C] text-white w-[10rem]"
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

      {/* main transaction section (mid) */}
      <div className="bg-white w-[calc(45rem)] h-[calc(100vh-2rem)] p-4">
        {/* Main search container */}
        <div className="flex flex-row gap-6">
          {/* left */}
          <div className="w-2/3">
            <div>
              <p>Customer Name</p>
              <p className="font-semibold text-xl">
                Nimal Gamage Rathnayake/Member
              </p>
            </div>
            {/* income details */}
            <div className="bg-[#E2E2E2] flex items-center justify-around border-black p-4 mx-10 mt-5">
              <div className="text-center">
                <div className="text-lg font-bold">RS. 20000</div>
                <div className="text-sm text-gray-600">Income</div>
              </div>
              {/* vertical divider */}
              <div
                role="separator"
                aria-orientation="vertical"
                className="w-px h-8 bg-white"
              />
              <div className="text-center">
                <div className="text-lg font-bold">RS. 20000</div>
                <div className="text-sm text-gray-600">Credits</div>
              </div>
            </div>
          </div>
          {/* right */}
          <div className="w-1/3 flex flex-col gap-3">
            <div>
              <p>Date</p>
              <p className="font-semibold text-xl">2025-08-02</p>
            </div>
          </div>
        </div>

        {/* transaction main table */}
        <table className="w-full min-w-[500px]">
          <thead className="bg-gray-700 text-white">
            <tr>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                #
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                Item code
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                Unit price
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
            {/* {selectedItems.map((item, index) => ( */}
            <tr
              // key={item.id}
              className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
              // onClick={() => handleTableRowClick(item)}
            >
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {index+1} */}
              </td>
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {item.code} */}
              </td>
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {item.quantity || 30}(pcs) */}
              </td>
              <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                {/* {item.total.toFixed(2)} */}
              </td>
            </tr>
            {/* ))} */}
          </tbody>
        </table>
      </div>

      <div className="bg-white w-[calc(32rem)] h-[calc(100vh-2rem)]">
        {/* member container */}
        <div className="w-full relative p-auto p-4">
          {/* Main search container */}
          <div className="flex flex-row gap-6">
            {/* left */}
            <div className="w-1/2 flex flex-col gap-3">
              <div>
                <p>Payment Method</p>
                <p className="font-semibold text-xl">Credit (06 Months)</p>
              </div>
              <div>
                <p>Cashier</p>
                <p className="font-semibold text-xl">Namal</p>
              </div>
            </div>
            {/* right */}
            <div className="w-1/2 flex flex-col gap-3">
              <div>
                <p>Date</p>
                <p className="font-semibold text-lg">2025-02-20</p>
              </div>
              <div>
                <p>Invoice No</p>
                <p className="font-semibold text-lg">RECP23213</p>
              </div>
            </div>
          </div>
          {/* table section */}
          {/* transaction main table */}
          <table className="w-full min-w-[500px] h-[40rem] overflow-y-scroll">
            <thead className="bg-gray-700 text-white">
              <tr>
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
              {/* {selectedItems.map((item, index) => ( */}
              <tr
                // key={item.id}
                className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
                // onClick={() => handleTableRowClick(item)}
              >
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                  {/* {item.code} */}
                </td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                  {/* {item.quantity || 30}(pcs) */}
                </td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                  {/* {item.total.toFixed(2)} */}
                </td>
              </tr>
              {/* ))} */}
            </tbody>
          </table>
          {/* Amounts */}
          <div className="grid grid-cols-2 p-3 bg-white w-full">
            <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-gray-500">
              Amount
            </div>
            <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">
              RS.20000
            </div>
            <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base text-gray-500">
              Discount Amount
            </div>
            <div className="p-2 bg-[#D9D9D9] text-lg lg:text-xl font-normal text-gray-800 text-right">
              RS.1000
            </div>
            <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-gray-500">
              Total Amount
            </div>
            <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">
              RS.19000
            </div>
            <div className="p-2 bg-white text-sm lg:text-base text-gray-500 h-16">
              Customer Gave
            </div>
            <div className="p-2 bg-white text-lg lg:text-3xl font-semibold text-[#737373] text-right  h-16 border-b-2 ">
              RS.20000
            </div>
            <div className="p-2 bg-[#F8F8F8] text-sm lg:text-base text-gray-500">
              Change Amount
            </div>
            <div className="p-2 bg-[#F8F8F8] text-lg lg:text-xl font-normal text-gray-800 text-right">
              RS.1000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
