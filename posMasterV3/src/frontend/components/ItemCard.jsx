import React, { useRef, useState, useEffect } from "react";
import barcodeImg from "../assets/barcode.png";
import placeholderImg from "../assets/card_placeholder_img.png";

//onOpen is the callback for opening the details for card
// onremove is the callback for for deleting a card
export default function ItemCard({ item, onOpen, onRemove }) {
  const nameRef = useRef(null);
  //for marquee effect in item name text
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth);
  }, [item.item_name]);

  const percentFull = (item.quantity / item.maximum_capacity) * 100;
  let statusColorClass;
  if (percentFull <= item.threshold_limit) {
    statusColorClass = "bg-red-500";
  } else if (percentFull <= item.threshold_limit + 20) {
    statusColorClass = "bg-yellow-500";
  } else {
    statusColorClass = "bg-green-500";
  }

  const imageSrc = item.image || placeholderImg;

  return (
    <div
      onClick={() => onOpen()}
      className="relative flex w-[24rem] h-[12rem] bg-white border border-gray-300 overflow-hidden cursor-pointer hover:shadow-md transform transition-transform duration-300 ease-in-out hover:scale-105"
      tabIndex={0}
    >
      {/* Left Section */}
      <div className="flex flex-col justify-between p-4 pl-6 w-[75%]">
        <div>
          <img src={barcodeImg} alt="Barcode" className="w-[70px] object-contain" />
          <p className="text-xs text-gray-400 -mt-2">SKU: {item.sku}</p>
        </div>
        <div>
          <div className="overflow-hidden max-w-[15rem]">
            <h2
              ref={nameRef}
              className={
                `text-3xl font-bold text-[#6C6C6C] whitespace-nowrap ` +
                (overflowing ? "marquee" : "")
              }
            >
              {item.item_name}
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-gray-100 border px-2 py-0.5 rounded-sm text-[#A7A7A7]">
              {item.category?.type || 'Unknown'}
            </span>
            <span className="text-sm font-medium text-gray-800">
              {item.category?.brand || 'Unknown'}
            </span>
          </div>
          <div className="flex flex-row gap-6">
          {/* <p className="text-xl font-extrabold text-black mt-2">
            (St)Rs.{item.retail_price}
            <span className="text-sm font-semibold">{item.uom?.symbol || 'unit'}</span>
          </p> */}
          <p className="text-xl font-extrabold text-black mt-2">
            (Ret)Rs.{item.stock_price}
            <span className="text-sm font-semibold">{item.uom?.symbol || 'unit'}</span>
          </p>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="relative w-[25%] overflow-hidden">
        <button
          className="absolute top-2 right-2 p-0.5 bg-black rounded-full hover:bg-gray-800 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(item.id);
          }}
          aria-label="Close"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
        <img src={imageSrc} alt={item.item_name} className="w-full h-full object-cover" />
      </div>


      {/* Status Indicator Circle */}
      <div
        className={
          `absolute top-2 z-[1] right-[3.7rem] w-16 h-16 rounded-full border-8 border-white ` +
          statusColorClass
        }
      />
    </div>
  );
}