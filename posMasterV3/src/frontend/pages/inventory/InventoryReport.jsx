import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { reportsApi, restockApi, salesApi, stockApi } from "../../api/localApi";
import InventoryRep from "./layout/InventoryRep";
import RestockRep from "./layout/RestockRep";
import DailyTransactionRep from "./layout/DailyTransactionRep";
import PettyCashReport from "./layout/PettyCashReport";
import TransactionB5Rep from "./layout/TransactionB5.jsx";

const REPORT_TITLES = {
  basic: "Inventory Status Report",
  restock: "Stock Acceptance Report",
  "petty-cash": "Petty Cash Report",
  "trans-b5": "Transactions Report (B5)",
  dailyTrans: "Daily Transaction Report",
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function toLocalISODate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizeInventoryItem(item = {}) {
  return {
    ...item,
    quantity: toNumber(item.quantity ?? item.stock_quantity ?? item.stockQuantity),
    retail_price: toNumber(
      item.retail_price ??
        item.retailPrice ??
        item.unit_price ??
        item.unitPrice ??
        item.stock_price ??
        item.stockPrice
    ),
    threshold_limit: toNumber(item.threshold_limit ?? item.thresholdLimit),
    maximum_capacity: toNumber(item.maximum_capacity ?? item.maximumCapacity ?? 100),
  };
}

function normalizeRestockItem(item = {}, section = "restocked") {
  const quantity = toNumber(item.quantity ?? item.qty ?? item.requested_qty ?? item.requestedQty);
  const stockPrice = toNumber(item.stock_price ?? item.stockPrice);
  const retailPrice = toNumber(item.retail_price ?? item.retailPrice);
  const stockTotal = toNumber(item.stock_total ?? item.stockTotal, stockPrice * quantity);
  const retailTotal = toNumber(item.retail_total ?? item.retailTotal, retailPrice * quantity);

  return {
    ...item,
    section,
    quantity,
    qty: quantity,
    stock_price: stockPrice,
    stockPrice,
    retail_price: retailPrice,
    retailPrice,
    stock_total: stockTotal,
    stockTotal,
    retail_total: retailTotal,
    retailTotal,
    sku: item.sku ?? item.item_sku ?? item.itemSku ?? "",
    batch_code: item.batch_code ?? item.batchCode ?? item.batch ?? item.batch_no ?? item.batchNo ?? "",
    description: item.description ?? item.reason ?? "",
  };
}

function normalizeRestockTransaction(transaction = {}, index = 0) {
  const addedItemsSource = Array.isArray(transaction.addedItems)
    ? transaction.addedItems
    : Array.isArray(transaction.added_items)
      ? transaction.added_items
      : [];
  const returnItemsSource = Array.isArray(transaction.returnItems)
    ? transaction.returnItems
    : Array.isArray(transaction.return_items)
      ? transaction.return_items
      : [];

  const addedItems = addedItemsSource.map((item) => normalizeRestockItem(item, "restocked"));
  const returnItems = returnItemsSource.map((item) => normalizeRestockItem(item, "returned"));

  return {
    ...transaction,
    id: transaction.id ?? transaction._id ?? null,
    invoice_no: transaction.invoice_no ?? transaction.invoiceNo ?? "",
    bill_no: transaction.bill_no ?? transaction.billNo ?? "",
    supplier_name:
      transaction?.supplier?.basic_info?.supplier_name ??
      transaction?.supplier?.supplier_name ??
      transaction.supplier_name ??
      transaction.supplierName ??
      transaction?.supplier?.name ??
      "Unknown Supplier",
    index_value: transaction.index_value ?? transaction.index ?? index + 1,
    created_at: transaction.created_at ?? transaction.createdAt ?? null,
    addedItems,
    returnItems,
    payment_method: transaction.payment_method ?? transaction.paymentMethod ?? "cash",
    discount: toNumber(transaction.discount ?? transaction.discountAmount),
    cashAmount: toNumber(transaction.cashAmount ?? transaction.cash_amount),
    changeAmount: toNumber(transaction.changeAmount ?? transaction.change_amount),
    totalAmount: toNumber(transaction.totalAmount ?? transaction.total_amount),
  };
}

function formatDurationLabel(value, paymentMethod = "") {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return String(paymentMethod).toLowerCase() === "cash" ? "Cash" : "Cash";
  }

  if (/^cash$/i.test(raw)) return "Cash";
  if (/^b\.?o\.?g\.?$/i.test(raw)) return "B.O.G";

  const monthMatch = raw.match(/(\d+)\s*(?:months?|mos?)/i);
  if (monthMatch) {
    return `${String(Number(monthMatch[1])).padStart(2, "0")} Months`;
  }

  const numericMatch = raw.match(/^(\d+)$/);
  if (numericMatch) {
    return `${String(Number(numericMatch[1])).padStart(2, "0")} Months`;
  }

  return raw.replace(/\s+/g, " ");
}

function resolveCustomerType(transaction = {}, memberRecord = null) {
  const explicitType =
    transaction.customer_type ??
    transaction.customerType ??
    transaction.type ??
    transaction.member_type ??
    transaction.memberType ??
    memberRecord?.member_type ??
    memberRecord?.memberType ??
    "";

  const typeText = String(explicitType || "").trim().toLowerCase();
  if (typeText.includes("staff") || typeText.includes("employee") || typeText.includes("worker")) return "Staff";
  if (typeText.includes("guest") || typeText.includes("walk")) return "Guest";
  if (typeText.includes("member") || ["regular", "vip", "wholesale", "tea_coop"].includes(typeText)) return "Member";
  if (memberRecord?.is_staff || memberRecord?.isStaff) return "Staff";
  return transaction.member_id || transaction.memberId || memberRecord ? "Member" : "Staff";
}

function resolveDailyTransactionDate(transaction = {}) {
  return transaction.created_at ?? transaction.createdAt ?? transaction.date ?? null;
}

function normalizeDailyTransaction(transaction = {}, memberLookup = new Map()) {
  if (!transaction || typeof transaction !== "object") return transaction;

  const memberKeyCandidates = [
    transaction.member_id,
    transaction.memberId,
    transaction.member_no,
    transaction.memberNo,
  ].filter((value) => value !== undefined && value !== null && value !== "");
  const memberRecord = memberKeyCandidates
    .map((value) => memberLookup.get(String(value)))
    .find(Boolean) || null;

  const durationLabel = formatDurationLabel(
    transaction.credit_duration ??
      transaction.creditDuration ??
      transaction.duration ??
      transaction.duration_label ??
      transaction.durationLabel ??
      "",
    transaction.payment_method ?? transaction.paymentMethod ?? ""
  );

  const customerType = resolveCustomerType(transaction, memberRecord);
  const invoiceNo = transaction.invoice_no ?? transaction.invoiceNo ?? transaction.bill_no ?? transaction.billNo ?? "";
  const memberNo =
    transaction.member_no ??
    transaction.memberNo ??
    memberRecord?.member_no ??
    memberRecord?.memberNo ??
    "";
  const memberName =
    transaction.member_name ??
    transaction.memberName ??
    memberRecord?.full_name ??
    memberRecord?.fullName ??
    memberRecord?.name ??
    "Guest";

  return {
    ...transaction,
    invoice_no: invoiceNo,
    invoiceNo,
    member_no: memberNo,
    memberNo,
    member_name: memberName,
    memberName,
    credit_duration: durationLabel,
    creditDuration: durationLabel,
    transaction_type: customerType,
    customer_type: customerType,
    total_amount: toNumber(transaction.total_amount ?? transaction.totalAmount ?? transaction.amount ?? 0),
    totalAmount: toNumber(transaction.totalAmount ?? transaction.total_amount ?? transaction.amount ?? 0),
    created_at: resolveDailyTransactionDate(transaction),
  };
}

function getQuantity(item = {}) {
  return toNumber(item.quantity ?? item.stock_quantity ?? item.stockQuantity);
}

function getUnitPrice(item = {}) {
  return toNumber(
    item.retail_price ??
      item.retailPrice ??
      item.stock_price ??
      item.stockPrice ??
      item.unit_price ??
      item.unitPrice
  );
}

function getLowStockThreshold(item = {}) {
  const explicitThreshold = Number(item.threshold_limit ?? item.thresholdLimit);
  if (Number.isFinite(explicitThreshold) && explicitThreshold > 0) {
    return explicitThreshold;
  }

  const capacity = Number(item.maximum_capacity ?? item.maximumCapacity);
  if (Number.isFinite(capacity) && capacity > 0) {
    return Math.max(1, Math.ceil(capacity * 0.2));
  }

  return 10;
}

function getStockStatus(item = {}) {
  const quantity = getQuantity(item);
  const lowThreshold = getLowStockThreshold(item);

  if (quantity <= 0) {
    return { text: "Out of Stock", className: "bg-red-100 text-red-700" };
  }

  if (quantity <= lowThreshold) {
    return { text: "Low Stock", className: "bg-amber-100 text-amber-700" };
  }

  return { text: "In Stock", className: "bg-emerald-100 text-emerald-700" };
}

function SpinnerMessage({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-10 shadow-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
      <p className="mt-4 text-sm font-semibold text-slate-700">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-rose-100 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">Could not load inventory data</h3>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1A318C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#152870]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function PrintButton({ reportType, onPrint, disabled }) {
  return (
    <button
      type="button"
      onClick={onPrint}
      disabled={disabled}
      className="flex h-12 items-center gap-2 rounded-xl bg-[#1A318C] px-6 font-medium text-white shadow-md shadow-blue-900/20 transition-all duration-200 hover:bg-[#152870] disabled:opacity-60"
    >
      <Printer className="h-4 w-4" />
      {disabled ? "Generating..." : `Print ${REPORT_TITLES[reportType] || "Report"}`}
    </button>
  );
}

export default function InventoryReport({ isActive }) {
  const [reportType, setReportType] = useState("basic");
  const [searchTermBasic, setSearchTermBasic] = useState("");
  const [isLoadingBasic, setIsLoadingBasic] = useState(false);
  const [errorBasic, setErrorBasic] = useState("");
  const [restockData, setRestockData] = useState([]);
  const [isLoadingRestock, setIsLoadingRestock] = useState(false);
  const [errorRestock, setErrorRestock] = useState("");
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  const [errorDaily, setErrorDaily] = useState("");
  const [pettyCashReportData, setPettyCashReportData] = useState([]);
  const [isLoadingPettyCash, setIsLoadingPettyCash] = useState(false);
  const [errorPettyCash, setErrorPettyCash] = useState("");
  const [transactionB5Data, setTransactionB5Data] = useState(null);
  const [isLoadingTransactionB5, setIsLoadingTransactionB5] = useState(false);
  const [errorTransactionB5, setErrorTransactionB5] = useState("");
  const [inventoryItems, setInventoryItems] = useState([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const inventoryReportRef = useRef(null);
  const currentDate = useMemo(() => toLocalISODate(), []);
  const reportNo = useMemo(() => `GDG-${currentDate.replaceAll("-", "")}`, [currentDate]);
  const dailyReportRange = useMemo(() => ({ startDate: currentDate, endDate: currentDate }), [currentDate]);

  const fetchInventoryStatus = useCallback(async () => {
    setIsLoadingBasic(true);
    setErrorBasic("");

    try {
      const response = await stockApi.getAll();

      if (response?.status !== "success") {
        throw new Error(response?.message || "Failed to load inventory status report.");
      }

      const rows = Array.isArray(response.data) ? response.data : [];
      setInventoryItems(rows.map(normalizeInventoryItem));
    } catch (error) {
      setInventoryItems([]);
      setErrorBasic(error?.message || "Unable to load inventory status report.");
    } finally {
      setIsLoadingBasic(false);
    }
  }, []);

  const fetchRestockData = useCallback(async () => {
    setIsLoadingRestock(true);
    setErrorRestock("");

    try {
      const response = await restockApi.getAll();

      if (response?.status !== "success") {
        throw new Error(response?.message || "Failed to load restock report.");
      }

      const rows = Array.isArray(response.data) ? response.data : [];
      const normalized = rows.map((transaction, index) => normalizeRestockTransaction(transaction, index));
      normalized.sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });
      setRestockData(normalized);
    } catch (error) {
      setRestockData([]);
      setErrorRestock(error?.message || "Unable to load restock report.");
    } finally {
      setIsLoadingRestock(false);
    }
  }, []);

  const fetchDailyTransactions = useCallback(async () => {
    setIsLoadingDaily(true);
    setErrorDaily("");

    try {
      console.log("[DTR][InventoryReport] fetch start", {
        isActive,
        reportType,
        currentDate,
        dailyReportRange,
        hasOnlineBridge: !!window.electronAPI?.online?.getDailyTransactionReport,
      });

      const response = await salesApi.getDailyTransactionReport(dailyReportRange);

      console.log("[DTR][InventoryReport] api response", {
        status: response?.status,
        message: response?.message,
        dataType: Array.isArray(response?.data) ? "array" : typeof response?.data,
        count: Array.isArray(response?.data) ? response.data.length : null,
        sample: Array.isArray(response?.data) ? response.data.slice(0, 5) : response?.data,
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "Failed to load daily transaction report.");
      }

      const responseData = response?.data?.data || response?.data || response || [];
      const rows = Array.isArray(responseData) ? responseData : [];

      console.log("[DTR][InventoryReport] unpacked rows", {
        responseDataType: Array.isArray(responseData) ? "array" : typeof responseData,
        responseDataCount: Array.isArray(responseData) ? responseData.length : null,
        rowsCount: rows.length,
        rowsSample: rows.slice(0, 5),
      });

      const normalized = rows
        .map((transaction) => normalizeDailyTransaction(transaction))
        .sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          if (bTime !== aTime) return bTime - aTime;
          return String(a.invoice_no || "").localeCompare(String(b.invoice_no || ""));
        });

      console.log("[DTR][InventoryReport] normalized rows", {
        count: normalized.length,
        sample: normalized.slice(0, 5).map((row) => ({
          invoiceNo: row.invoice_no,
          createdAt: row.created_at,
          duration: row.duration,
          customerType: row.customer_type,
          totalAmount: row.totalAmount,
          memberNo: row.member_no,
          memberName: row.member_name,
        })),
      });

      setDailyTransactions(normalized);
    } catch (error) {
      setDailyTransactions([]);
      setErrorDaily(error?.message || "Unable to load daily transaction report.");
    } finally {
      setIsLoadingDaily(false);
    }
  }, [dailyReportRange]);

  const fetchPettyCashReport = useCallback(async () => {
    setIsLoadingPettyCash(true);
    setErrorPettyCash("");

    try {
      const response = await reportsApi.getPettyCashReport({
        startDate: currentDate,
        endDate: currentDate,
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "Failed to load petty cash report.");
      }

      setPettyCashReportData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setPettyCashReportData([]);
      setErrorPettyCash(error?.message || "Unable to load petty cash report.");
    } finally {
      setIsLoadingPettyCash(false);
    }
  }, [currentDate]);

  const fetchTransactionB5Report = useCallback(async () => {
    setIsLoadingTransactionB5(true);
    setErrorTransactionB5("");

    try {
      const response = await reportsApi.getTransactionB5Report({
        startDate: currentDate,
        endDate: currentDate,
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "Failed to load B5 report.");
      }

      setTransactionB5Data(response?.data || null);
    } catch (error) {
      setTransactionB5Data(null);
      setErrorTransactionB5(error?.message || "Unable to load B5 report.");
    } finally {
      setIsLoadingTransactionB5(false);
    }
  }, [currentDate]);

  useEffect(() => {
    if (!isActive || reportType !== "basic") {
      return;
    }

    void fetchInventoryStatus();
  }, [isActive, reportType, fetchInventoryStatus]);

  useEffect(() => {
    if (!isActive || reportType !== "restock") {
      return;
    }

    void fetchRestockData();
  }, [isActive, reportType, fetchRestockData]);

  useEffect(() => {
    if (!isActive || reportType !== "dailyTrans") {
      return;
    }

    void fetchDailyTransactions();
  }, [isActive, reportType, fetchDailyTransactions]);

  useEffect(() => {
    if (!isActive || reportType !== "petty-cash") {
      return;
    }

    void fetchPettyCashReport();
  }, [isActive, reportType, fetchPettyCashReport]);

  useEffect(() => {
    if (!isActive || reportType !== "trans-b5") {
      return;
    }

    void fetchTransactionB5Report();
  }, [isActive, reportType, fetchTransactionB5Report]);

  const filteredItemsBasic = useMemo(() => {
    const term = searchTermBasic.trim().toLowerCase();

    return inventoryItems.filter((item) => {
      if (!term) return true;

      const searchable = [
        item.item_name,
        item.sku,
        item.category?.type,
        item.category?.brand,
        item.uom?.symbol,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [inventoryItems, searchTermBasic]);

  const summary = useMemo(() => {
    const totalItems = inventoryItems.length;
    const totalValue = inventoryItems.reduce((sum, item) => {
      return sum + getQuantity(item) * getUnitPrice(item);
    }, 0);
    const lowStockCount = inventoryItems.filter((item) => getStockStatus(item).text === "Low Stock").length;
    const outOfStockCount = inventoryItems.filter((item) => getStockStatus(item).text === "Out of Stock").length;

    return { totalItems, totalValue, lowStockCount, outOfStockCount };
  }, [inventoryItems]);

  const handlePrint = useCallback(() => {
    if (pdfGenerating) return;

    setPdfGenerating(true);

    try {
      const pageSelectorMap = {
        basic: ".report-page",
        restock: ".restock-page",
        "petty-cash": ".petty-cash-page",
        "trans-b5": ".transaction-b5-page",
        dailyTrans: ".daily-page",
      };

      const selector = pageSelectorMap[reportType] || ".report-page";
      const pages = document.querySelectorAll(selector);

      if (!pages.length) {
        alert("No report pages found");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Popup blocked. Please allow popups to print.");
        return;
      }

      const contentHtml = Array.from(pages)
        .map((page) => page.outerHTML)
        .join("");

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${REPORT_TITLES[reportType] || "Report"}</title>
          </head>
          <body>
            ${contentHtml}
            <script>
              window.onload = function () {
                window.print();
                window.onafterprint = function () {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    } finally {
      setPdfGenerating(false);
    }
  }, [pdfGenerating, reportType]);

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-row bg-gray-50">
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <nav className="border-b border-gray-100 bg-white shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTermBasic}
                  onChange={(e) => setSearchTermBasic(e.target.value)}
                  placeholder="Search by item name, SKU, or category..."
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm transition-all focus:border-[#1A318C] focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20"
                />
              </div>

              <PrintButton reportType={reportType} onPrint={handlePrint} disabled={pdfGenerating} />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <p>
                Showing <span className="font-semibold text-gray-800">{filteredItemsBasic.length}</span> of{" "}
                {summary.totalItems} items
              </p>
              <p>Total value: Rs. {summary.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </nav>

        <div className="flex-1 p-6">
        {reportType === "basic" ? (
            isLoadingBasic ? (
              <SpinnerMessage
                title="Loading inventory data..."
                subtitle="Fetching live stock rows from the backend."
              />
            ) : errorBasic ? (
              <ErrorState message={errorBasic} onRetry={fetchInventoryStatus} />
            ) : filteredItemsBasic.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-10 shadow-sm">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
                  <BarChart3 className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-800">No inventory data found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or waiting for data to sync.</p>
              </div>
            ) : (
              <InventoryRep
                ref={inventoryReportRef}
                items={filteredItemsBasic}
                getStockStatus={getStockStatus}
                maxHeight="calc(100vh - 300px)"
                title={REPORT_TITLES.basic}
                subTitle="Current stock availability overview"
              />
            )
          ) : reportType === "restock" ? (
            <RestockRep
              restockData={restockData}
              isLoading={isLoadingRestock}
              error={errorRestock}
              onRetry={fetchRestockData}
              maxHeight="calc(100vh - 300px)"
              title={REPORT_TITLES.restock}
              subTitle="Live stock acceptance data fetched from the backend"
            />
          ) : reportType === "petty-cash" ? (
            isLoadingPettyCash ? (
              <SpinnerMessage
                title="Loading petty cash report..."
                subtitle="Fetching live petty cash data from the backend."
              />
            ) : errorPettyCash ? (
              <ErrorState message={errorPettyCash} onRetry={fetchPettyCashReport} />
            ) : (
              <PettyCashReport
                reportData={pettyCashReportData}
                companyName="මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමුපකාර සමිතිය"
                branchName="කොටපොල"
                reportDate={currentDate}
                preparedBy="Accounts"
                maxHeight="calc(100vh - 300px)"
              />
            )
          ) : reportType === "trans-b5" ? (
            isLoadingTransactionB5 ? (
              <SpinnerMessage
                title="Loading B5 report..."
                subtitle="Fetching live B5 data from the backend."
              />
            ) : errorTransactionB5 ? (
              <ErrorState message={errorTransactionB5} onRetry={fetchTransactionB5Report} />
            ) : (
              <TransactionB5Rep
                meta={transactionB5Data?.meta}
                topTable={transactionB5Data?.topTable}
                receivedRows={transactionB5Data?.receivedRows}
                expensesRows={transactionB5Data?.expensesRows}
              />
            )
          ) : reportType === "dailyTrans" ? (
            <DailyTransactionRep
              transactions={dailyTransactions}
              isLoading={isLoadingDaily}
              error={errorDaily}
              onRetry={fetchDailyTransactions}
              maxHeight="calc(100vh - 300px)"
              companyName="මොරවක්කෝරලේ තේ නිපදවන්නන්ගේ සමුපකාර සමිතිය"
              branchName="කොටපොල"
              reportNo={reportNo}
              reportDate={currentDate}
            />
          ) : null}
        </div>
      </div>

      <div className="h-full w-72 bg-gray-100 p-3">
        <div className="flex h-full flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A318C]/10">
                  <FileText className="h-4 w-4 text-[#1A318C]" />
                </div>
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-700">Report Type</span>
              </div>
            </div>

            <div className="space-y-2 p-3">
              <button
                type="button"
                onClick={() => setReportType("basic")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition-all ${
                  reportType === "basic"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Inventory Status Report
              </button>
              <button
                type="button"
                onClick={() => setReportType("restock")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition-all ${
                  reportType === "restock"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Inventory Restock Report
              </button>
              <button
                type="button"
                onClick={() => setReportType("petty-cash")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition-all ${
                  reportType === "petty-cash"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Petty Cash Report (F-15)
              </button>
              <button
                type="button"
                onClick={() => setReportType("dailyTrans")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition-all ${
                  reportType === "dailyTrans"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Daily Transaction Report
              </button>
              <button
                type="button"
                onClick={() => setReportType("trans-b5")}
                className={`w-full rounded-lg px-4 py-3 text-left font-medium transition-all ${
                  reportType === "trans-b5"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Transactions Report (B5)
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-gray-100 bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}
