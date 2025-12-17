import React, { useEffect, useState } from 'react'
import {ChevronDown, ChevronUp } from "lucide-react";
import { apiClient } from '../../api/client';
import { extractDateOnly } from '../../util/common/date';

function CheckHistory({isAcitve}) {
  // right section controls
  const [leftActiveSection, setLeftActiveSection] = useState("transactions"); // "items"(default) | "transactions"
  //right filter section controls(for supplier transaction table)
  const [openSupplier, setOpenSupplier] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);

  const [isLoadingTrans, setIsLoading] = useState(false);
  //supplier searching and filtering operations
  const [searchLoadingTrans, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");


  //all transaction data from all suppliers
  const [transData, setTransData] = useState([
    {
      _id: '68c950a37a0d64d512af4369',
      id: 1,
      sup_id: 1,
      prep_agent_id: '2',
      auth_agent_id: '3',
      date: '2025-09-16T11:57:22.000Z',
      invoice_no: 'INdVd004',
      bill_no: 'BIdLLd004',
      payment_method: 'cash',
      discount: 5,
      expenses: 10,
      current_amount: 100,
      cash_amount: 95,
      change_amount: 5,
      total_amount: 105,
      exe_level: 'medium',
      added_items: [
        {
          sku: 'SI02123',
          batch_code: 'BATCH124',
          qty: 50,
          availability: true,
          stock_price: 1.5,
          retail_price: 2,
          exp_date: '2025-12-31T00:00:00.000Z',
          discount_price: 0,
          date: '2025-09-16T11:57:23.000Z',
        },
      ],
      return_items: [
        {
          sku: 'SI02123',
          batch_code: 'BATCH456',
          qty: 1,
          description: 'Damaged item',
        },
      ],
      restock_update_datetime: '2025-09-16T11:57:23.000Z',
      restock_created_datetime: '2025-09-16T11:57:23.000Z',
      __v: 0,
    },
    {
      _id: '68c9e7750eef63964bd20723',
      id: 3,
      sup_id: 1,
      prep_agent_id: '2',
      auth_agent_id: '3',
      date: '2025-09-16T22:40:53.000Z',
      invoice_no: 'INdVdgg004',
      bill_no: 'BIdLgLd004',
      payment_method: 'cash',
      discount: 5,
      expenses: 10,
      current_amount: 100,
      cash_amount: 95,
      change_amount: 5,
      total_amount: 105,
      exe_level: 'medium',
      added_items: [
        {
          sku: 'SI02123',
          batch_code: 'BATCH124',
          qty: 50,
          availability: true,
          stock_price: 1.5,
          retail_price: 2,
          exp_date: '2025-12-31T00:00:00.000Z',
          discount_price: 0,
          date: '2025-09-16T22:40:53.000Z',
        },
      ],
      return_items: [
        {
          sku: 'SKU102',
          batch_code: 'BATCH456',
          qty: 1,
          description: 'Damaged item',
        },
      ],
      restock_update_datetime: '2025-09-16T22:40:53.000Z',
      restock_created_datetime: '2025-09-16T22:40:53.000Z',
      __v: 0,
    },
  ]);

  const fetchTransactionList = async () => {
    try {
      const response = await apiClient.get("api/restocks");
      if (response.data.status === "success") {
        setTransData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Fetch supplier from API
  useEffect(() => {
    // if (!loadingUoms) {
    fetchTransactionList();
    // }
    //}, [loadingUoms]);
  }, []);


  //for items from a selected supplier
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  //supplier searching and filtering operations
  const [searchLoadingItems, setSearchLoadingItems] = useState(false);
  const [searchItems, setSearchItems] = useState("");
  // const [searchItemCategory, setSearchItemCategory] = useState("All");
  // const [searchItemAvailability, setSearchItemAvailability] = useState("All");

  //transaction details of a selected supplier(for items table)
  const [selectedTransData, setSelectedTransData] = useState(
    {
      _id: '68c950a37a0d64d512af4369',
      id: 1,
      sup_id: 1,
      prep_agent_id: '2',
      auth_agent_id: '3',
      date: '2025-09-16T11:57:22.000Z',
      invoice_no: 'INdVd004',
      bill_no: 'BIdLLd004',
      payment_method: 'cash',
      discount: 5,
      expenses: 10,
      current_amount: 100,
      cash_amount: 95,
      change_amount: 5,
      total_amount: 105,
      exe_level: 'medium',
      added_items: [
        {
          sku: 'SI02123',
          batch_code: 'BATCH124',
          qty: 50,
          availability: true,
          stock_price: 1.5,
          retail_price: 2,
          exp_date: '2025-12-31T00:00:00.000Z',
          discount_price: 0,
          date: '2025-09-16T11:57:23.000Z',
        },
      ],
      return_items: [
        {
          sku: 'SI02123',
          batch_code: 'BATCH456',
          qty: 1,
          description: 'Damaged item',
        },
      ],
      restock_update_datetime: '2025-09-16T11:57:23.000Z',
      restock_created_datetime: '2025-09-16T11:57:23.000Z',
      __v: 0,
    },
  );

  // to populate selectd item list from a transaction
  const handleTableRowClick = (i) => {
    setLeftActiveSection("items")
    setSelectedTransData(i);
  };

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
                placeholder="Search supplier by name"
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
                  Supplier
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Transaction Date
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Amount(Rs.)
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
            {isLoadingTrans ? (
                // single row that spans all columns and centers the spinner vertically/horizontally
                <tr>
                  <td colSpan={5}>
                    <div className="h-[22rem] w-full flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12"></div>
                        <span className="mt-3 text-gray-700 text-lg">Loading table...</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : searchLoadingTrans ? (
                <tr>
                  <td colSpan={5}>
                    <div className="h-[22rem] w-full flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12 mb-3"></div>
                      <span className="text-gray-700 text-xl mt-1">Please wait...</span>
                    </div>
                  </td>
                </tr>
              ) : transData.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="h-[18rem] w-full flex items-center justify-center">
                      <span className="text-gray-500 text-lg">No suppliers found!</span>
                    </div>
                  </td>
                </tr>
              ) : (
                transData.map((t, index) => (
                <tr
                  //key={item.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
                >
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {index + 1} 
                  </td>
                 <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {t.sup_id}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {extractDateOnly(t.date)}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {t.total_amount}
                  </td>
                  <td className='flex flex-row gap-3 items-center justify-center'>
                  <button
                    onClick={
                      () => handleTableRowClick(t)
                    }
                    className="flex items-center justify-center w-6 h-6 mt-2 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors"
                  >
                    <BackIcon />
                  </button>
                  </td>
                </tr>
              ))
              )
            }
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
                <p className="text-xl font-semibold">{selectedTransData.invoice_no}</p>
              </div>
              <div>
                <p>Date:</p>
                <p className="text-xl font-semibold">{extractDateOnly(selectedTransData.date)}</p>
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
                <p className="text-xl font-semibold">{selectedTransData.sup_id}</p>
              </div>
              <div>
                <p>Prepared by:</p>
                <p className="text-xl font-semibold">{selectedTransData.prep_agent_id}</p>
              </div>
              <div>
                <p>Authorized by:</p>
                <p className="text-xl font-semibold">{selectedTransData.auth_agent_id}</p>
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
                  Expiration Date
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
  {isLoadingItems ? (
    // single row that spans all columns and centers the spinner vertically/horizontally
    <tr>
      <td colSpan={9}>
        <div className="h-[22rem] w-full flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12"></div>
            <span className="mt-3 text-gray-700 text-lg">Loading items...</span>
          </div>
        </div>
      </td>
    </tr>
  ) : searchLoadingItems ? (
    <tr>
      <td colSpan={9}>
        <div className="h-[22rem] w-full flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12 mb-3"></div>
          <span className="text-gray-700 text-xl mt-1">Please wait...</span>
        </div>
      </td>
    </tr>
  ) : selectedTransData.added_items.length === 0 ? (
    <tr>
      <td colSpan={9}>
        <div className="h-[18rem] w-full flex items-center justify-center">
          <span className="text-gray-500 text-lg">No Items found!</span>
        </div>
      </td>
    </tr>
  ) : (
    <>
      {selectedTransData.added_items.map((i, index) => (
        <tr
          //key={item.id}
          className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
          // onClick={() => handleTableRowClick(i)}
        >
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {index + 1}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.sku}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.exp_date}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {extractDateOnly(i.exp_date)}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.qty}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.stock_price}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.stock_price * i.qty}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.retail_price}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.retail_price * i.qty}
          </td>
        </tr>
      ))}
      {selectedTransData.return_items.map((i, index) => (
        <tr
          //key={item.id}
          className={`border-b bg-red-100 border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
          // onClick={() => handleTableRowClick(item)}
        >
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {selectedTransData.added_items.length + index + 1}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.sku}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.exp_date}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {extractDateOnly(i.exp_date)}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {i.qty}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {/* {i.stock_price} */}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {/* {i.stock_price * i.qty} */}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {/* {i.retail_price} */}
          </td>
          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
            {/* {i.retail_price * i.qty} */}
          </td>
        </tr>
      ))}
    </>
  )}
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
