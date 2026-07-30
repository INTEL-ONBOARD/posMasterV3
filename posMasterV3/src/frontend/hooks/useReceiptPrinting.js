import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  THERMAL_PAGE_HEIGHT_MM,
  THERMAL_PRINT_WIDTH_MM,
  THERMAL_NETWORK_PRINT_TIMEOUT_MS,
  RECEIPT_CANVAS_SCALE,
  MM_TO_PT,
  buildEscposRasterCommand
} from "../pages/sales/utils/escposRaster";

const waitForBrowserPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

/**
 * Receipt/print orchestration for the sales terminal: renders the off-screen
 * BillContent node to a canvas, then prints it either as a raw ESC/POS
 * raster (thermal network printer) or as a sized PDF (system printer), plus
 * the receipt preview modal's data plumbing.
 */
export function useReceiptPrinting({
  invoiceNo,
  currentUser,
  selectedMember,
  formattedDate,
  selectedItems,
  stockTotal,
  getCartUnitPrice,
  setStatusModal
}) {
  const billRef = useRef(null);
  const checkoutDataRef = useRef(null);

  const [receiptCheckoutData, setReceiptCheckoutData] = useState(null);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [receiptPreviewData, setReceiptPreviewData] = useState(null);
  const [lastReceiptData, setLastReceiptData] = useState(null);
  // Which copy the off-screen BillContent currently renders. The print loop
  // flips this to capture "office" then "customer" from the same node.
  const [receiptVariant, setReceiptVariant] = useState("office");

  const captureReceiptCanvas = async (checkoutData, variant = "office") => {
    if (!billRef.current) throw new Error("Receipt content is not ready");
    checkoutDataRef.current = checkoutData;
    setReceiptCheckoutData(checkoutData);
    setReceiptVariant(variant);
    await waitForBrowserPaint();

    return html2canvas(billRef.current, {
      scale: RECEIPT_CANVAS_SCALE,
      useCORS: true,
      backgroundColor: "#ffffff"
    });
  };

  const getReceiptPrinterConfig = async () => {
    if (!window.electronAPI?.getReceiptPrinterConfig) {
      return { mode: "auto", networkHost: null };
    }

    const response = await window.electronAPI.getReceiptPrinterConfig();
    if (response?.status !== "success") {
      return { mode: "auto", networkHost: null };
    }

    return {
      mode: response.data?.mode || "auto",
      networkHost: response.data?.networkHost || null,
      networkAutoDiscovery: Boolean(response.data?.networkAutoDiscovery),
    };
  };

  const printReceiptToThermalPrinter = async (canvas, options = {}) => {
    if (!window.electronAPI?.printThermalReceipt) {
      throw new Error("Thermal printer IPC is not available");
    }

    const commands = buildEscposRasterCommand(canvas);
    const response = await window.electronAPI.printThermalReceipt({
      data: commands.buffer,
      mode: "network",
      timeoutMs: options.timeoutMs || THERMAL_NETWORK_PRINT_TIMEOUT_MS
    });

    if (response?.status !== "success") {
      throw new Error(response?.message || "Thermal receipt print failed");
    }

    return response;
  };

  const buildReceiptPdfArrayBuffer = async (canvas) => {
    // The page IS the printhead. The Windows driver anchors the PDF page origin
    // at the printhead's first dot rather than on the physical paper, so a page
    // wider than the head (or any x offset within it) pushes content off the
    // right edge with nothing to catch it. Emitting a page exactly one
    // printhead wide, drawn edge to edge, maps page x=0..72mm onto dots 0..575.
    const rollWidthPt = THERMAL_PRINT_WIDTH_MM * MM_TO_PT;
    const rollPageHeightPt = THERMAL_PAGE_HEIGHT_MM * MM_TO_PT;

    const doc = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: [rollWidthPt, rollPageHeightPt]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const printableWidth = pageWidth;
    const printableHeight = pageHeight;
    const offsetX = 0;

    // Canvas px -> PDF pt.
    const pxToPt = 0.75 / RECEIPT_CANVAS_SCALE;
    const imgWidthPt = canvas.width * pxToPt;
    const scaleToRoll = printableWidth / imgWidthPt;

    let positionYpx = 0;
    let pageNumber = 0;

    while (positionYpx < canvas.height) {
      const maxSliceHeightPx = Math.floor(
        printableHeight / pxToPt / scaleToRoll
      );

      const sliceHeightPx = Math.min(canvas.height - positionYpx, maxSliceHeightPx);

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;

      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Failed to create 2D context for slice canvas");

      ctx.drawImage(
        canvas,
        0,
        positionYpx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );

      const sliceData = sliceCanvas.toDataURL("image/png");
      const sliceHeightPt = sliceHeightPx * pxToPt * scaleToRoll;

      if (pageNumber > 0) doc.addPage();
      doc.addImage(
        sliceData,
        "PNG",
        offsetX,
        0,
        printableWidth,
        sliceHeightPt
      );

      positionYpx += sliceHeightPx;
      pageNumber++;
    }

    return doc.output("arraybuffer");
  };

  const printReceiptViaSystemPrinter = async (canvas) => {
    const arrayBuffer = await buildReceiptPdfArrayBuffer(canvas);

    if (window.electronAPI?.printReceiptPdf) {
      const response = await window.electronAPI.printReceiptPdf({
        data: arrayBuffer,
        mode: "system"
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "System receipt print failed");
      }

      return response;
    }

    if (!window.electronAPI?.sendPrintSilent) {
      throw new Error("System print IPC is not available");
    }

    window.electronAPI.sendPrintSilent(arrayBuffer);
  };

  // Every sale prints two copies back-to-back: the signed office copy first,
  // then the customer copy. Each ESC/POS payload ends with a cut, so the two
  // separate cleanly. The routing is resolved once so network auto-discovery
  // does not re-run for the second copy.
  const RECEIPT_COPIES = ["office", "customer"];

  const printReceipt = async (checkoutData) => {
    const printerConfig = await getReceiptPrinterConfig();
    const printerMode = printerConfig.mode;

    let route; // "system" | "network" | "auto-network"
    if (printerMode === "system") route = "system";
    else if (printerMode === "network") route = "network";
    else if (!printerConfig.networkHost && !printerConfig.networkAutoDiscovery) route = "system";
    else route = "auto-network";

    try {
      for (const variant of RECEIPT_COPIES) {
        const canvas = await captureReceiptCanvas(checkoutData, variant);

        if (route === "system") {
          await printReceiptViaSystemPrinter(canvas);
        } else if (route === "network") {
          await printReceiptToThermalPrinter(canvas);
        } else {
          try {
            await printReceiptToThermalPrinter(canvas);
          } catch (networkPrintError) {
            console.warn(
              "[SalesView] Network receipt print failed; trying system printer",
              networkPrintError
            );
            await printReceiptViaSystemPrinter(canvas);
            route = "system"; // remaining copies go straight to the system printer
          }
        }
      }
    } finally {
      // Leave the off-screen node on the office copy for the preview default.
      setReceiptVariant("office");
    }
  };

  const stock_items = selectedItems.map((item) => ({
    ...item,
    retail_price: getCartUnitPrice(item),
    total_price: (getCartUnitPrice(item) - (item.customer_discount || 0)) * item.customer_quantity,
  }));

  const currentReceiptCheckoutData = receiptCheckoutData || checkoutDataRef.current;

  // "2026/07/16 04:53PM" — the sale date (from formattedDate) plus the current
  // time. The new receipt design shows a timestamp; formattedDate is date-only.
  const formatReceiptDateTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const date = String(formattedDate || "").replace(/-/g, "/");
    return `${date} ${String(hours).padStart(2, "0")}:${minutes}${ampm}`;
  };

  const buildBillDataSnapshot = (checkoutData = currentReceiptCheckoutData) => ({
    invoiceNo: invoiceNo,
    cashier_name: currentUser?.username || "-",
    payment_method: checkoutData?.paymentMethodName || checkoutData?.paymentMethod || "cash",
    date_time: formatReceiptDateTime(),
    member_name: selectedMember?.is_guest ? "" : (selectedMember?.full_name || ""),
    member_no: selectedMember?.member_no || "-",
    installment_term: checkoutData?.installmentTerm || checkoutData?.installment_term || "",
    stock_items: stock_items.map((item) => ({ ...item })),
    totalAmount: stockTotal,
    discountAmount: checkoutData?.finalDiscount || 0,
    finalAmount: checkoutData?.totalAmount || stockTotal,
    cashAmount: checkoutData?.cashAmount || 0,
    changeAmount: checkoutData?.changeAmount || 0,
  });

  // Bill data uses the latest checkout data captured for receipt generation.
  const billData = buildBillDataSnapshot(currentReceiptCheckoutData);

  const openReceiptPreview = () => {
    const previewData = selectedItems.length > 0
      ? buildBillDataSnapshot(currentReceiptCheckoutData)
      : lastReceiptData;

    if (!previewData) {
      setStatusModal({ open: true, type: 'failed', description: "No receipt available to preview" });
      return;
    }

    setReceiptPreviewData(previewData);
    setIsReceiptPreviewOpen(true);
  };

  return {
    billRef,
    billData,
    receiptVariant,
    lastReceiptData,
    setLastReceiptData,
    isReceiptPreviewOpen,
    setIsReceiptPreviewOpen,
    receiptPreviewData,
    buildBillDataSnapshot,
    openReceiptPreview,
    printReceipt
  };
}
