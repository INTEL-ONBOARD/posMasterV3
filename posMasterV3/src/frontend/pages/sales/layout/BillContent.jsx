// BillContent.jsx
import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import JsBarcode from "jsbarcode";

/**
 * BillContent - off-screen printable bill component.
 *
 * Renders one copy of the receipt. The two printed copies share this whole
 * body and differ only in the footer, selected by `variant`:
 *   - "office"   : shop copy — carries the signature line + goods-received
 *                  acknowledgement (kept and signed by the member). No label.
 *   - "customer" : handed to the customer — no signature block, stamped
 *                  "Customer Copy".
 *
 * The width is 512px by design; the print pipeline scales this to the printer's
 * 72mm printable width. Keep new columns inside that budget (see the item table).
 */
const BillContent = React.forwardRef(({ billData = {}, variant = "office" }, ref) => {
  const items = Array.isArray(billData.stock_items) ? billData.stock_items : [];
  const barcodeRef = useRef(null);

  const fmt = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  };

  // "Rs. 1,000.00" style grouping for the money column, matching the design.
  const fmtMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.00";
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const uomSymbol = (item) => String(item?.uom?.symbol || item?.uom_symbol || "").trim();

  // Unit price with its selling unit, e.g. "100.00 /1pcs". Falls back to the
  // bare price when an item has no UOM configured.
  const unitPriceLabel = (item) => {
    const sym = uomSymbol(item);
    return sym ? `${fmt(item.retail_price)} /1${sym}` : fmt(item.retail_price);
  };

  // Quantity with its unit, e.g. "2pcs". Sub-unit conversion (0.5kg -> 500g)
  // is a separate display rule that does not exist in the data model yet, so
  // the stored unit is shown as-is.
  const quantityLabel = (item) => {
    const sym = uomSymbol(item);
    const qty = item.customer_quantity ?? "";
    return sym ? `${qty}${sym}` : `${qty}`;
  };

  const barcodeValue = String(billData.barcode || billData.invoiceNo || "").trim();

  useEffect(() => {
    if (!barcodeRef.current || !barcodeValue) return;
    try {
      JsBarcode(barcodeRef.current, barcodeValue, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0,
      });
    } catch {
      // An unencodable value should never blank the whole receipt.
    }
  }, [barcodeValue]);

  const isOffice = variant !== "customer";

  return (
    <div
      ref={ref}
      className="box-border w-[512px] bg-white px-5 pt-6 pb-10 text-black font-sans flex flex-col leading-[1.4]"
    >
      {/* ---------- header ---------- */}
      <div className="flex flex-col items-center justify-center text-center mb-5">
        <h1 className="text-[24px] leading-[1.24] font-extrabold mb-1">
          {billData.org_name ?? "මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමූපකාර සමිතිය - කොටපොල"}
        </h1>
        <h2 className="text-[20px] leading-[1.24] font-bold mb-1">
          {billData.shop_name ?? "ඇලන්වැලි සමූපකාර වෙළදසැල"}
        </h2>
        <p className="text-[16px] font-bold">
          {billData.org_address ?? "No.91, කොටපොල, මාතර"}
          {billData.org_phone ? ` -  ${billData.org_phone}` : " -  0344940670"}
        </p>
      </div>

      <hr className="border-t border-gray-400 my-4" />

      {/* ---------- meta ---------- */}
      <div className="flex flex-row justify-between gap-4 text-[16px] leading-[1.7]">
        <div className="flex flex-col min-w-0">
          <span>ඉන්වොයිස් අංකය:</span>
          <span className="text-[19px]">{billData.invoiceNo ?? ""}</span>
          <span>අයකැමි: {billData.cashier_name ?? ""}</span>
          <span>ගෙවීම් ක්‍රමය: {billData.payment_method ?? ""}</span>
        </div>
        <div className="flex flex-col shrink-0 text-right">
          <span>{billData.date_time ?? ""}</span>
          <span>සාමාජික නම : {billData.member_name ?? ""}</span>
          <span>සාමාජික අංකය : {billData.member_no ?? ""}</span>
          {billData.installment_term ? (
            <span>වාරික ගණන : {billData.installment_term}</span>
          ) : null}
        </div>
      </div>

      <hr className="border-t border-gray-400 my-4" />

      {/* ---------- items ---------- */}
      <table className="w-full table-fixed border-collapse text-[15px] leading-[1.3]">
        <thead>
          <tr>
            <th className="py-2 pr-1 font-bold text-center border-b border-gray-500 w-[34px]">අං.</th>
            <th className="py-2 px-1 font-bold text-left border-b border-gray-500">ද්‍රව්‍ය</th>
            <th className="py-2 px-1 font-bold text-right border-b border-gray-500 w-[104px]">මිල</th>
            <th className="py-2 px-1 font-bold text-right border-b border-gray-500 w-[64px]">ප්‍රමා.</th>
            <th className="py-2 px-1 font-bold text-right border-b border-gray-500 w-[56px]">වට්ටම</th>
            <th className="py-2 pl-1 font-bold text-right border-b border-gray-500 w-[84px]">වටිනා.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <React.Fragment key={item.id || item.stock_id || `${item.item_id}-${item.batch_code}-${index}`}>
              <tr>
                <td className="pt-3 pr-1 text-center align-top tabular-nums">{index + 1}</td>
                <td className="pt-3 px-1 text-left align-top text-[18px]" colSpan={5}>
                  <div className="break-words">{item.item_name ?? ""}</div>
                </td>
              </tr>
              <tr>
                <td className="pb-3"></td>
                <td className="pb-3"></td>
                <td className="pb-3 px-1 text-right align-top tabular-nums">{unitPriceLabel(item)}</td>
                <td className="pb-3 px-1 text-right align-top tabular-nums">{quantityLabel(item)}</td>
                <td className="pb-3 px-1 text-right align-top tabular-nums">{fmt(item.customer_discount)}</td>
                <td className="pb-3 pl-1 text-right align-top tabular-nums">{fmtMoney(item.total_price)}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <hr className="border-t border-gray-600 my-4" />

      {/* ---------- totals ---------- */}
      <div className="flex flex-col text-[18px] leading-[1.85]">
        <div className="flex flex-row justify-between gap-6">
          <p>මුළු වටිනාකම:</p>
          <p className="tabular-nums">{fmtMoney(billData.totalAmount)}</p>
        </div>
        <div className="flex flex-row justify-between gap-6">
          <p>වට්ටම් එකතුව:</p>
          <p className="tabular-nums">{fmtMoney(billData.discountAmount)}</p>
        </div>
        <div className="flex flex-row justify-between gap-6 font-extrabold text-[28px] leading-[1.3] mt-1">
          <p>ගෙවිය යුතු මුදල:</p>
          <p className="tabular-nums">{fmtMoney(billData.finalAmount)}</p>
        </div>

        <hr className="border-t border-gray-600 my-3" />

        <div className="flex flex-row justify-between gap-6">
          <p>ලබා දුන් මුදල :</p>
          <p className="tabular-nums">{fmtMoney(billData.cashAmount)}</p>
        </div>
        <div className="flex flex-row justify-between gap-6">
          <p>ඉතිරි මුදල :</p>
          <p className="tabular-nums">{fmtMoney(billData.changeAmount)}</p>
        </div>
      </div>

      <hr className="border-t border-gray-400 my-4" />

      {/* ---------- footer (varies by copy) ---------- */}
      <div className="flex flex-col items-center justify-center text-center text-[15px] leading-[1.45]">
        {isOffice ? (
          <div className="mb-2 mt-14">
            <div>------------------------------</div>
            <div>අත්සන</div>
            <div className="mt-2">ඉහත සදහන් ද්‍රව්‍ය නිවැරදිව භාර ගතිමි.</div>
          </div>
        ) : null}

        <div className="my-2">මුදල් හෝ භාණ්ඩ වෙනසක් අත්නම් දින 30ක් ඇතුලත දැනුම් දිය යුතුය.</div>
        <div className="text-[18px]">------------THANK YOU COME AGAIN-----------</div>
        <div className="text-[21px] font-extrabold">POSMaster</div>

        {barcodeValue ? (
          <div className="flex flex-col items-center mt-4">
            <canvas ref={barcodeRef} />
            <div className="text-[15px] tracking-widest mt-1">{barcodeValue}</div>
          </div>
        ) : null}

        {!isOffice ? (
          <div className="text-[18px] font-bold mt-4">Customer Copy</div>
        ) : null}
      </div>
    </div>
  );
});

BillContent.displayName = "BillContent";

BillContent.propTypes = {
  billData: PropTypes.object,
  variant: PropTypes.oneOf(["office", "customer"]),
};

export default BillContent;
