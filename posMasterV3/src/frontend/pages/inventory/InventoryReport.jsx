import React, { useState, useEffect, useRef } from "react";
import { Search, FileText, Printer, Package, DollarSign, AlertTriangle, Tag, ChevronDown, ChevronUp, Filter, SortAsc, BarChart3 } from "lucide-react";
import { itemApi } from "../../api/localApi";
// to print inventory report
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import InventoryRep from "./layout/InventoryRep";
import RestockRep from "./layout/RestockRep";

export default function InventoryReport({ isActive }) {
  //switches between reports for printing
  const [reportType, setReportType] = useState("basic"); // basic || restock || dailyTrans
  const [searchTermBasic, setSearchTermBasic] = useState("");
  const [searchLoadingBasic, setSearchLoadingBasic] = useState(false);
  const [isLoadingBasic, setIsLoadingBasic] = useState(true);
  const [isLoadingRestock, setIsLoadingRestock] = useState(false);

  const [sortOrder, setSortOrder] = useState("name_asc");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");

  const [inventoryItems, setInventoryItems] = useState([]);
  const inventoryReportRef = useRef(null); // single ref pointing to basic inventory printable container
    const restockReportRef = useRef(null); // single ref pointing to restock printable container
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // print basic report
  const generateInventoryReportPdf = async () => {
  if (pdfGenerating) return;

  try {
    setPdfGenerating(true);
    const pages = document.querySelectorAll(".report-page");
    if (!pages.length) return;

    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const scale = pdfWidth / imgWidth;
      const pdfHeight = imgHeight * scale;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error(err);
  } finally {
    setPdfGenerating(false);
  }
};

  // print restock report
    // print basic report
  const generateRestockReportPdf = async () => {
  if (pdfGenerating) return;

  try {
    setPdfGenerating(true);
    const pages = document.querySelectorAll(".restock-page");
    if (!pages.length) return;

    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const scale = pdfWidth / imgWidth;
      const pdfHeight = imgHeight * scale;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`restock-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error(err);
  } finally {
    setPdfGenerating(false);
  }
};

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      if (!isActive) return;
      setIsLoadingBasic(true);
      try {
        const response = await itemApi.getAllExtended();
        if (response.status === "success") {
          setInventoryItems(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setIsLoadingBasic(false);
      }
    };
    fetchItems();
  }, [isActive]);

  // Calculate summary statistics
  const totalItems = inventoryItems.length;
  const totalValue = inventoryItems.reduce((sum, item) => sum + (parseFloat(item.retail_price || 0) * (item.quantity || 0)), 0);
  const lowStockItems = inventoryItems.filter(item => {
    const percentFull = (item.quantity / item.maximum_capacity) * 100;
    return percentFull <= (item.threshold_limit || 30);
  }).length;
  const categories = [...new Set(inventoryItems.map(item => item.category?.type).filter(Boolean))];

  // Search handler
  const handleSearch = (e) => {
    setSearchLoadingBasic(true);
    setSearchTermBasic(e.target.value);
    setTimeout(() => setSearchLoadingBasic(false), 400);
  };

  // Filter and sort items
  const filteredItemsBasic = inventoryItems
    .filter(item => {
      const matchesSearch = searchTermBasic === "" ||
        item.item_name?.toLowerCase().includes(searchTermBasic.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTermBasic.toLowerCase()) ||
        item.category?.type?.toLowerCase().includes(searchTermBasic.toLowerCase());

      const matchesCategory = filterCategory === "all" || item.category?.type === filterCategory;

      const percentFull = (item.quantity / item.maximum_capacity) * 100;
      const isLowStock = percentFull <= (item.threshold_limit || 30);
      const matchesStock = filterStock === "all" ||
        (filterStock === "low" && isLowStock) ||
        (filterStock === "in_stock" && !isLowStock);

      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "name_asc":
          return (a.item_name || "").localeCompare(b.item_name || "");
        case "name_desc":
          return (b.item_name || "").localeCompare(a.item_name || "");
        case "stock_high":
          return (b.quantity || 0) - (a.quantity || 0);
        case "stock_low":
          return (a.quantity || 0) - (b.quantity || 0);
        case "price_high":
          return (b.retail_price || 0) - (a.retail_price || 0);
        case "price_low":
          return (a.retail_price || 0) - (b.retail_price || 0);
        default:
          return 0;
      }
    });

  // Get stock status
  const getStockStatus = (item) => {
    const percentFull = (item.quantity / item.maximum_capacity) * 100;
    if (percentFull <= (item.threshold_limit || 30)) {
      return { text: "Low Stock", class: "bg-red-100 text-red-700" };
    } else if (percentFull <= (item.threshold_limit || 30) + 20) {
      return { text: "Medium", class: "bg-amber-100 text-amber-700" };
    }
    return { text: "In Stock", class: "bg-emerald-100 text-emerald-700" };
  };

  return (
    <div className="flex flex-row bg-gray-50 h-[calc(100vh-2rem)]">
      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {/* Search Header */}
        <nav className="bg-white border-b border-gray-100 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTermBasic}
                  onChange={handleSearch}
                  placeholder="Search by item name, SKU, or category..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>

              <button
                onClick={() => {
                  if (reportType === "basic") {
                    generateInventoryReportPdf();  // ← add ()
                  } else if (reportType === "restock") {
                    generateRestockReportPdf();    // ← add ()
                  }
                }}
                disabled={pdfGenerating}
                className="h-12 px-6 bg-[#1A318C] disabled:opacity-60 text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2"
              >
                Generate PDF
                <Printer className="w-4 h-4" />
                {pdfGenerating ? "Generating..." : "Print"}
              </button>
            </div>
            {/* Results count */}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{filteredItemsBasic.length}</span> of {totalItems} items
              </p>
            </div>
          </div>
        </nav>


      {/* Conditionally render only one report section */}
      {reportType === "basic" ? (
        <div className="flex-1 p-6">
          {isLoadingBasic ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Loading inventory data...</p>
            </div>
          ) : searchLoadingBasic ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Searching...</p>
            </div>
          ) : filteredItemsBasic.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <BarChart3 className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No inventory data found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <InventoryRep
              ref={inventoryReportRef}
              items={filteredItemsBasic}
              getStockStatus={getStockStatus}
              maxHeight="calc(100vh - 300px)"
              onRowClick={(item) => console.log("row clicked", item)}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 p-6">
          {isLoadingRestock ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Loading inventory data...</p>
            </div>
          ) : (
            <RestockRep
              ref={restockReportRef}
              maxHeight="calc(100vh - 300px)"
            />
          )}
          {/* You can uncomment and add the empty state when ready */}
          {/* : filteredItemsRestock.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <BarChart3 className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No inventory data found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <RestockRep ... />
          ) */}
        </div>
      )}

      </div>

      {/* Right Filter Section*/}
      <div className="bg-gray-100 w-72 h-full p-3">
        <div className="flex flex-col h-full gap-3">
          {/* Report Type Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#1A318C]" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Report Type</span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <button
                onClick={() => setReportType("basic")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  reportType === "basic"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Basic Report
              </button>
              <button
                onClick={() => setReportType("restock")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  reportType === "restock"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Restock Report
              </button>
              <button
                onClick={() => setReportType("dailyTrans")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  reportType === "dailyTrans"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Daily Transaction Report
              </button>
            </div>
          </div>


          {/* Spacer */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
        </div>
      </div>
    </div>
  );
}
