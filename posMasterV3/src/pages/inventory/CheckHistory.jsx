import React, { useState } from 'react'
import {ChevronDown, ChevronUp } from "lucide-react";

function CheckHistory() {
  // right section controls
  const [leftActiveSection, setLeftActiveSection] = useState("items"); // "items"(default) | "transactions"

  //right filter section controls
  const [openSupplier, setOpenSupplier] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);

  return (
    <div className="flex bg-black w-full h-[calc(100vh-2rem)] relative">
      {/* transaction tables section (left) */}
      <div className="bg-white w-[calc(85rem)] h-[calc(100vh-2rem)] overflow-y-scroll p-4">
        
        {/* transaction table */}
        {leftActiveSection === "transactions" && (
          <div>
        {/* search bar with dropdowns */}
          <nav className="w-full flex justify-between py-4 bg-white gap-6 mb-4 ">
            <div className="flex-1 flex border-b border-[#EDEDED] h-12 items-center">
              <input
                type="text"
                // value={search}
                // onChange={handleSearch}
                placeholder="Search Your Items here"
                className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
              />
              <button
                // onClick={handleSearch}
                className="flex items-center px-4 py-2 bg-[#1A318C] text-white"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </svg>
                Search
              </button>
            </div>

          </nav>
        {/* table */}
        <div className="overflow-x-auto h-[28rem] p-2 lg:p-4">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-700 text-[#848484]">
              <tr>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  #
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Name
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Status
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Due Amount
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Previous Amount
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Current Amount
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">

                <tr
                  //key={item.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
                  // onClick={() => handleTableRowClick(item)}
                >
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {index + 1} {item.code} */} 1
                  </td>
                 <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.quantity || 30}(pcs) */}ABC Company
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.quantity || 30}(pcs) */}Available
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className='flex flex-row gap-3 items-center justify-center'>
                  <button
                    onClick={() => setLeftActiveSection("items")}
                    className="flex items-center justify-center w-6 h-6 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors"
                  >
                    <BackIcon />
                  </button>
                  <button
                    type="button"
                    //onClick={onClose}
                    aria-label="Close notification"
                    className="m-3 w-5 h-5 rounded-full bg-black inline-flex items-center justify-center focus:outline-none"
                    >
                    <svg
                      className="w-4 h-4 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
          </div>
        )}

        {/* item table */}
        {leftActiveSection === "items" && (
          <div className='px-5'>
            <button
              onClick={() => setLeftActiveSection("transactions")}
              className="flex items-center justify-center w-8 h-8 mb-4 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors"
            >
              <BackIcon />
            </button>

        {/* search bar with dropdowns */}
          <nav className="w-full flex justify-between py-4 bg-white gap-6 mb-4 ">
            <div className="flex-1 flex border-b border-[#EDEDED] h-12 items-center">
              <input
                type="text"
                // value={search}
                // onChange={handleSearch}
                placeholder="Search Your Items here"
                className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
              />
              <button
                // onClick={handleSearch}
                className="flex items-center px-4 py-2 bg-[#1A318C] text-white"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </svg>
                Search
              </button>
            </div>

          </nav>

          <div className="flex flex-col gap-5 divide-y-2 divide-gray-100 min-w-full">
            <div className="flex flex-row gap-10 justify-between">
              <div className='flex flex-row gap-10'>

              <div>
                <p>Invoice No:</p>
                <p className="text-xl font-semibold">Ranathunga Pvt(Ltd)</p>
              </div>
              <div>
                <p>Date:</p>
                <p className="text-xl font-semibold">Ranathunga Pvt(Ltd)</p>
              </div>
              </div>
              <div>
                <p>Status:</p>
                <p className="text-xl font-semibold text-green-400">Approved</p>
              </div>
            </div>

            <div className="flex flex-row gap-10 pt-3">
              <div>
                <p>Supplier:</p>
                <p className="text-xl font-semibold">Ranathunga Pvt(Ltd)</p>
              </div>
              <div>
                <p>Handled by:</p>
                <p className="text-xl font-semibold">Mr. Kamal</p>
              </div>
              <div>
                <p>Authorized by:</p>
                <p className="text-xl font-semibold">Mr. Rathnasiri</p>
              </div>
            </div>
          </div>



        {/* table */}
        <div className="overflow-x-auto h-[28rem] py-4">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-700 text-[#848484]">
              <tr>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  #
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Item No
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Item Name
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Date
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Unit Count
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Stock Price
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Stock Total
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Retail Price
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Retail Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">

                <tr
                  //key={item.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
                  // onClick={() => handleTableRowClick(item)}
                >
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {index + 1} {item.code} */} 1
                  </td>
                 <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.quantity || 30}(pcs) */}ABC Company
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.quantity || 30}(pcs) */}Available
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}2025-04-04
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
          </div>
        )}
      </div>

      {/* filter section (right) */}
      <div className="bg-white w-[calc(20rem)] h-[calc(100vh-2rem)]">
        <div className="flex flex-col h-[45rem] gap-3">
          {/* top block set */}
          <div>
          {/* ▼ search filters block ▼ */}
          <div className="bg-white">
            <button
              onClick={() => setOpenSupplier(!openSupplier)}
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">SEARCH FILTERS</span>
              {openSupplier ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openSupplier && (
              <div className="px-4 bg-white pb-5">
                {/* detailed description block */}
                <div className="">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Suppier
                      </label>
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- select supplier --</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Date
                      </label>
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- select date --</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Amount
                      </label>
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- select amount --</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>


                </div>
              </div>
            )}
          </div>

          {/* ▼ order by block ▼ */}
          <div className="bg-white">
            <button
              onClick={() => setOpenOrderBy(!openOrderBy)}
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ORDER BY</span>
              {openOrderBy ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openOrderBy && (
              <div className="px-4 bg-white pb-5">
                {/* detailed description block */}
                <div className="">
                    <div>
                      {/* <label className="block text-sm font-medium text-gray-400 mb-1">
                        Suppier
                      </label> */}
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Default</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>

                </div>
              </div>
            )}
          </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default CheckHistory

// icon used for all back buttons
const BackIcon = () => (
  <svg
    className="w-4 h-4 text-black"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 19l-7-7 7-7"
    />
  </svg>
);
