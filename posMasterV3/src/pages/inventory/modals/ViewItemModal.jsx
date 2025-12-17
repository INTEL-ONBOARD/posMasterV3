import React, { useState, useEffect } from "react";
//modal images
import barcodeImg from "../../../assets/barcode.png";
import placeholderImg from "../../../assets/card_placeholder_img.png";

import { extractDateOnly } from "../../../util/common/date";
import { apiClient } from "../../../api/client";

function ViewItemModal({ isOpen, closeModal, item }) {
  if (!isOpen) return null;


    useEffect (() => {
      fetchStockEntries(item.sku)
    }, []);
    
  //const imageSrc = item.image = null || placeholderImg;
  const imageSrc = placeholderImg;

  //to populate recent batch code changes
  const [stockEntries, setStockEntries] = useState([]);
  // fetch stock entries for a given SKU
  const fetchStockEntries = async (sku) => {
    if (!sku) return;
    try {
      const response = await apiClient.get(`api/restocks/stock-data/${sku}`);
      const payload = response?.data;
      console.log(response.data);

      if (payload) {
        if (payload.status === 'success' && Array.isArray(payload.data)) {
          setStockEntries(payload.data);
          console.log(stockEntries);
        } else if (Array.isArray(payload)) {
          setStockEntries(payload);
        } else if (Array.isArray(payload.data)) {
          setStockEntries(payload.data);
        } else {
          setStockEntries([]);
          //setStockFetchError(payload.message || 'Unexpected response shape');
        }

      } else {
        setStockEntries([]);
        //setStockFetchError('Empty response from server');
      }
    } catch (err) {
      console.error('Failed to fetch stock entries for', sku, err);
      setStockEntries([]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop (click to close) */}
      <div
        className="absolute inset-0 bg-black opacity-60"
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
        <div className="p-14 bg-white w-[70rem] h-[40rem] flex flex-row justify-between">
                {/* close button top-left */}
      <button
        onClick={closeModal}
        className="absolute top-6 right-6 mr-8 mt-8 w-6 h-6 rounded-full bg-black/90 text-white flex items-center justify-center z-[10001]"
        aria-label="Close"
        title="Close"
      >
        ✕
      </button>
          {/* left section */}
          <div className="w-2/3 flex flex-col justify-between">
            {/* basic details section */}
            <div className="flex flex-row gap-10 text-left">
              <img
                src={imageSrc} //alt={item.item_name}
                className="w-[10rem] h-full object-fill"
              />
              {/* right */}
              <div>
                <p className="text-3xl font-bold text-[#6C6C6C]">{item.item_name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-md bg-gray-100 border px-2 py-0.5 rounded-sm text-[#A7A7A7]">
                    {item.category?.type || "unkonwn"}
                    </span>
                    <span className="text-md font-medium text-gray-800">
                    {item.category?.brand || "unkonwn"}
                    </span>
                </div>

              </div>
            </div>
            {/* stock details section */}
            <div className="mr-16 mb-10 grid grid-cols-2 gap-y-4 gap-x-1 text-left">
              <p className="text-lg font-semibold text-[#706B6B]">Batch Code:</p>
              <p className="text-lg font-regular text-black">{item.category?.type || "unkonwn"}</p>

              <p className="text-lg font-semibold text-[#706B6B]">Quantity:</p>
              <p className="text-lg font-regular text-black">{item.quantity || "none"}</p>

              <p className="text-lg font-semibold text-[#706B6B]">Lower Threshold Limit:</p>
              <p className="text-lg font-regular text-black">0</p>

              <p className="text-lg font-semibold text-[#706B6B]">Stock Price (Rs.):</p>
              <p className="text-lg font-regular text-black">{item.stock_price || "none"}</p>

              <p className="text-lg font-semibold text-[#706B6B]">Retail Price (Rs.):</p>
              <p className="text-lg font-regular text-black">{item.retail_price || "none"}</p>

              <p className="text-lg font-semibold text-[#706B6B]">Expiration Date:</p>
              <p className="text-lg font-regular text-black">{extractDateOnly(item.exp_date) || "none"}</p>
            </div>

          </div>
          {/* right section */}
          <div className="w-1/3 flex flex-col justify-between">
            <div className="flex flex-col items-end mb-4">
              <img
                src={barcodeImg}
                alt="Barcode"
                className="w-[120px] object-contain"
              />
              <p className="text-xs text-gray-400 -mt-2">SKU: {}</p>
            </div>

            {/* recent barcode changes */}
                <div className="flex flex-col gap-3 overflow-y-scroll overflow-x-hidden h-[16rem] -mr-4">
                    {stockEntries.length === 0 ? (
                      <div className="text-gray-500">No recent batches</div>
                    ) : (
                      stockEntries.map((s, i) => (
                        <div
                          //key={s.batch_code + i}
                          className={`flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[320px]`}
                          //onClick={() => setStockBatchCodeFromEntry(s)}
                        >
                          <div className="flex flex-col">
                            <span className="text-md font-bold">Batchcode:</span>
                            <span className="text-gray-600">
                              {s.batch_code}

                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-bold">
                              {s.qty}
                               units</span>
                            <span className="text-gray-400">
                              {s.exp_date ? extractDateOnly(s.exp_date) : 'none'}
                               Exp</span>
                          </div>
                        </div>
                      ))
                    )
                    }
                    {/* end recent batches list */}

                  </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewItemModal;
