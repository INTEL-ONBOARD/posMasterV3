import React from 'react'
import { useState } from 'react';
import {ChevronDown, ChevronUp } from "lucide-react";

function SupplierReg() {

  const [openSupplier, setOpenSupplier] = useState(true);

  return (
    <div className="flex bg-black w-full h-[calc(100vh-2rem)] relative">
      {/* form section (left) */}
      <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] overflow-y-scroll">
        <div className="flex flex-col h-[56rem] gap-3">
          {/* top block set */}
          <div>
          {/* ▼ supplier description block ▼ */}
          <div className="bg-white">
            <button
              onClick={() => setOpenSupplier(!openSupplier)}
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">SUPPLIER DESCRIPTION</span>
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
                    <div className='mt-1'>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Address
                      </label>
                      <textarea
                      value=""
                      //onChange=
                      placeholder="Enter details..."
                      rows={3}
                      className="w-full mt-2 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  <div className="mt-1 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Current Amount (Rs.)
                      </label>
                      <input
                        type="number"
                        name="stock_price"
                        // value={formData.stock_price}
                        // onChange={handleInputChange}
                        placeholder="Enter item price"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Previous Amount (Rs.)
                      </label>
                      <input
                        type="text"
                        name="retail_price"
                        // value={formData.retail_price}
                        // onChange={handleInputChange}
                        placeholder="Enter item price"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Status
                      </label>
                      <select
                        name="availability"
                        // value={formData.availability}
                        // onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- select status --</option>
                        <option value={true}>Available</option>
                        <option value={false}>Unavailable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Contact
                      </label>
                      <input
                        type="text"
                        name="retail_price"
                        // value={formData.retail_price}
                        // onChange={handleInputChange}
                        placeholder="Enter item price"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Payment Account
                      </label>
                      <input
                        type="text"
                        name="retail_price"
                        // value={formData.retail_price}
                        // onChange={handleInputChange}
                        placeholder="Enter item price"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>


                </div>
              </div>
            )}
          </div>
          </div>

        </div>

        {/* Bottom button set */}
        <div className="flex flex-row gap-4 px-2 justify-around">
          <button
            // onClick={() => {
            //   clearUserInput();
            //   //switch from update item button to add item button 
            //   setUserEditing(false)
            // }}
            className="px-6 py-2 w-[12rem] h-10  border bg-[#D01710] border-gray-300 text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <button
            // onClick={() => {
            //   clearUserInput();
            //   //switch from update item button to add item button 
            //   setUserEditing(false)
            // }}
            className="px-6 py-2 w-[8rem] h-10  border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
          {/* switch between update and add button functions based on item card selection and clear form button click */}
          <button
            // onClick={isUserEditting ? updateItem : createItem}
            className="px-6 py-2 h-10 w-[8rem] bg-blue-600 text-white hover:bg-[#1A318C] transition-colors"
          >
            {/* {isUserEditting ? 'Update' : 'Add Item'} */}Save
          </button>

        </div>
      </div>
      {/* table section (right) */}
      <div className="bg-white w-[calc(77rem)] h-[calc(100vh-2rem)]">
        {/* search bar with dropdowns */}
          <nav className="w-full flex justify-between py-4 px-10 bg-white gap-6 mb-4 ">
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


            <select
              // value={searchCategory}
              // onChange={(e) => setSearchCategory(e.target.value)}
              className="w-80 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
            >
              <option value="All">All Categories</option>
                {/* {uniqueCategoryTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                  </option>
                  ))} */}
            </select>
            <select
              // value={viewMode}
              // onChange={(e) => setViewMode(e.target.value)}
              className="w-80 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
            >
              <option value="grid">Sort by</option>
              <option value="grid">Name</option>
              <option value="list">Current Amount</option>
            </select>
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
                  <td>

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
    </div>
  )
}

export default SupplierReg