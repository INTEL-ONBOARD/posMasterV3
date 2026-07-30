import React from "react";
import { generateUniqueString } from "../../../util/common/generate";
import { getEffectiveSellingPrice } from "../../../util/common/uomPricing";

// The transaction table in the mid column: rows for items staged to be
// added (selectedStockItemList) followed by rows for items staged to be
// returned (selectedReturnItemList). Clicking a row re-loads it into the
// left-panel edit form; the trash icon removes it from the list.
export default function RestockItemsTable({
  selectedStockItemList,
  selectedReturnItemList,
  formDataRegItem,
  returnItemSelected,
  addRegItemToForm,
  addReturnItemToForm,
  removeStockItemFromList,
  removeReturnItemFromList,
}) {
  return (
    <div className="flex-1 overflow-hidden bg-white">
      <div className="h-full overflow-y-auto p-4">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-slate-700 to-slate-600 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
              Item Code
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
              Quantity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
              Stock Price
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
              Stock Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
              Retail Price
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
              Retail Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide w-12">
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* Map selectedStockItemList */}
          {selectedStockItemList.map((item, index) => {
            const itemId = item.id ?? item._id;
            const formId = formDataRegItem.id ?? formDataRegItem._id;
            const retailUnitPrice = getEffectiveSellingPrice(item);
            return (
            <tr
              onClick={() => {
                addRegItemToForm(item);
              }}
              key={`${itemId || generateUniqueString()}-${index}`}
              className={`${itemId === formId && item.item_name === formDataRegItem.item_name && !returnItemSelected ? 'bg-[#1A318C]/5 ring-2 ring-[#1A318C] ring-inset' : ''} hover:bg-gray-50 cursor-pointer transition-all`}
            >
              <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">
                {index + 1}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-800 font-mono">
                {item.sku}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                <span className="font-semibold">{item.quantity}</span>
                <span className="text-gray-400 ml-1">({item.uom_symbol})</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                {(item.stock_price - item.item_discount_amt).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-800 tabular-nums">
                {((item.stock_price - item.item_discount_amt) * item.quantity).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                {retailUnitPrice.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-800 tabular-nums">
                {(retailUnitPrice * item.quantity).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStockItemFromList(itemId);
                  }}
                  aria-label="Remove item"
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white text-gray-400 inline-flex items-center justify-center transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </td>
            </tr>
          )})}

          {/* Map selectedReturnItemList */}
          {selectedReturnItemList.map((item, index) => {
            const itemId = item.id ?? item._id;
            const formId = formDataRegItem.id ?? formDataRegItem._id;
            return (
            <tr
              onClick={() => {
                addReturnItemToForm(item);
              }}
              key={`${itemId || item.item_name || "item"}-${index}`}
              className={`${itemId === formId && item.item_name === formDataRegItem.item_name && returnItemSelected ? 'ring-2 ring-red-400 ring-inset' : ''} bg-red-50 hover:bg-red-100 cursor-pointer transition-all`}
            >
              <td className="px-4 py-3 text-sm text-red-600 tabular-nums">
                {selectedStockItemList.length + index + 1}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-red-700 font-mono">
                {item.sku}
              </td>
              <td className="px-4 py-3 text-sm text-red-600 tabular-nums">
                <span className="font-semibold">{item.return_quantity}</span>
                <span className="text-red-400 ml-1">({item.uom_symbol})</span>
              </td>
              <td className="px-4 py-3 text-sm text-red-400">—</td>
              <td className="px-4 py-3 text-sm text-red-400">—</td>
              <td className="px-4 py-3 text-sm text-red-400">—</td>
              <td className="px-4 py-3 text-sm text-red-400">—</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeReturnItemFromList(itemId);
                  }}
                  aria-label="Remove item"
                  className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-500 hover:text-white text-red-400 inline-flex items-center justify-center transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      </div>
    </div>
  );
}
