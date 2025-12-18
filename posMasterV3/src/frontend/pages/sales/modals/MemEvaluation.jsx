import React, { useState, useEffect } from "react";
//modal images
import barcodeImg from "../../../assets/barcode.png";
import placeholderImg from "../../../assets/card_placeholder_img.png";

import { extractDateOnly, getCurrentDate } from "../../../util/common/date";

function MemEvaluationModal({ isOpen, closeModal, member }) {
  if (!isOpen) return null;

  useEffect(() => {}, []);

  //const imageSrc = item.image = null || placeholderImg;
  const imageSrc = placeholderImg;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center ml-[8rem]"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop (click to close) */}
      <div
        className="absolute inset-0 bg-black opacity-70"
        //style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
        onClick={closeModal}
      />

      {/* modal content */}
      <div
        className="relative z-[20] flex flex-col items-center justify-center text-center p-6"
        onClick={(e) => e.stopPropagation()}
        style={{
          transition: "transform 160ms ease, opacity 160ms ease",
        }}
      >
        <div className="p-16 bg-white gap-10 w-[105rem] h-[45rem] flex flex-row justify-between">
          {/* close button top-left */}
          <button
            onClick={closeModal}
            className="absolute top-6 right-6 mr-6 mt-6 w-6 h-6 rounded-full bg-black/90 text-white flex items-center justify-center z-[50]"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
          {/* left section */}
          <div className="w-3/4 flex flex-col justify-between">
            {/* customer details */}
            <div className="text-left px-10 grid grid-cols-2 gap-y-6 grid-rows-2">
              <div>
                <p>Customer Name</p>
                <p className="font-semibold text-xl">Guest</p>
              </div>
              <div>
                <p>Date</p>
                <p className="font-semibold text-xl">{getCurrentDate()}</p>
              </div>
              <div>
                <p>Member ID</p>
                <p className="font-semibold text-xl">Guest</p>
              </div>
              {/* <div>
                <p>Pre-Member ID</p>
                <p className="font-semibold text-xl">Guest</p>
              </div> */}
            </div>
            <p className="text-[#B3B3B3] font-semibold my-6">Total Installment Summary</p>
            {/* transaction details */}
            <div className="overflow-x-auto h-full p-2 lg:p-4">
              <table className="w-full min-w-[500px]">
                <thead className="bg-[#313131] text-white">
                  <tr>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Month
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Income
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Advance
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      06 Month
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      03 Month
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      02 Month
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      01 Month
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Installments
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Cash
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Remaining
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {
                    //selectedItems.map((item, index) => (
                    <tr
                      //key={item.id}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                      //onClick={() => handleTableRowClick(item)}
                    >
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        JAN
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000.00
                      </td>
                    </tr>
                    //))
                  }
                </tbody>
              </table>
            </div>
          </div>
          {/* TODO: add a divider between left and right sections */}
          {/* right section */}
          <div className="w-1/4">
            {/* income details */}
            <div className="bg-[#E2E2E2] flex flex-row justify-around border-black p-4">
              <div className="text-center">
                <div className="text-xl font-bold text-[#4A673D]">RS. 0.00</div>
                <div className="text-sm font-semibold text-[#4A673D]">INCOME</div>
              </div>
              {/* vertical divider */}
              <div
                role="separator"
                aria-orientation="vertical"
                className="w-px h-8 bg-white"
              />
              <div className="text-center">
                <div className="text-xl font-bold text-[#946333]">RS. 0.00</div>
                <div className="text-sm font-semibold text-[#946333]">CREDITS</div>
              </div>
            </div>
            <p className="text-[#B3B3B3] font-semibold my-10">Total Installment Summary</p>
            {/* Installment details */}
            <div className="grid grid-cols-[2fr_1fr] gap-x-4 items-center text-left">
              <p className="text-[#484848]">Total Credit Amount (Rs.):</p>
              <p className="text-[#484848] font-semibold">0.00</p>

              <p className="text-[#484848]">Tot. Installment Amt. per Month (Rs.):</p>
              <p className="text-[#484848] font-semibold">0.00</p>
            </div>


            <div className="overflow-x-auto h-full">
              <table className="w-full min-w-[500px]">
                <thead className="bg-[#313131] text-white">
                  <tr>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Month
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Installment
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Deducted
                    </th>
                    <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-normal">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {
                    //selectedItems.map((item, index) => (
                    <tr
                      //key={item.id}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                      //onClick={() => handleTableRowClick(item)}
                    >
                      <td className="px-2 lg:px-3 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        JAN
                      </td>
                      <td className="px-2 lg:px-3 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000
                      </td>
                      <td className="px-2 lg:px-3 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000
                      </td>
                      <td className="px-2 lg:px-3 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        20,000
                      </td>
                    </tr>
                    //))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemEvaluationModal;
