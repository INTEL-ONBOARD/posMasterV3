import { useState, useCallback } from "react";
import { Search, Trash2, Plus, RefreshCw, X, AlertTriangle, Package } from "lucide-react";
import { useReactiveData, TABLES } from "../../store";
import { disposedApi, stockApi } from "../../api/localApi";

export default function DisposedItemsView({ isActive }) {
  const { data: disposals, loading, refetch } = useReactiveData(
    TABLES.DISPOSED_ITEMS,
    null,
    { enabled: isActive }
  );

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Stock search for disposal form
  const [stockSearch, setStockSearch] = useState("");
  const [stockResults, setStockResults] = useState([]);
  const [stockSearching, setStockSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  const [form, setForm] = useState({ quantity: "", reason: "" });

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleStockSearch = useCallback(async (query) => {
    setStockSearch(query);
    setSelectedStock(null);
    if (!query.trim()) { setStockResults([]); return; }
    setStockSearching(true);
    try {
      const res = await stockApi.getAllWithItems();
      if (res?.status === 'success') {
        const q = query.toLowerCase();
        setStockResults(
          (res.data || []).filter(s =>
            s.item?.item_name?.toLowerCase().includes(q) ||
            s.item?.sku?.toLowerCase().includes(q) ||
            s.batch_code?.toLowerCase().includes(q)
          ).slice(0, 10)
        );
      }
    } catch (e) {
      console.error('[DisposedItemsView] stock search error:', e);
    } finally {
      setStockSearching(false);
    }
  }, []);

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setStockSearch(`${stock.item?.item_name} — Batch: ${stock.batch_code}`);
    setStockResults([]);
  };

  const handleCreate = async () => {
    if (!selectedStock) { setSubmitError("Please select a stock batch"); return; }
    const qty = parseFloat(form.quantity);
    if (!qty || qty <= 0) { setSubmitError("Quantity must be greater than 0"); return; }
    if (qty > selectedStock.quantity) {
      setSubmitError(`Only ${selectedStock.quantity} units available`);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const disposedBy = sessionStorage.getItem('username') || localStorage.getItem('username') || null;
      const res = await disposedApi.create({
        stock_id: selectedStock.id,
        quantity: qty,
        reason: form.reason || null,
        disposed_by: disposedBy
      });
      if (res?.status === 'success') {
        setShowModal(false);
        setForm({ quantity: "", reason: "" });
        setSelectedStock(null);
        setStockSearch("");
        refetch();
      } else {
        setSubmitError(res?.message || "Failed to record disposal");
      }
    } catch (e) {
      setSubmitError(e.message || "Failed to record disposal");
    } finally {
      setSubmitting(false);
    }
  };

  const safeDisposals = disposals || [];
  const filtered = safeDisposals.filter(d => {
    const q = search.toLowerCase();
    return (
      (d.item_name || "").toLowerCase().includes(q) ||
      (d.sku || "").toLowerCase().includes(q) ||
      (d.batch_code || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100 shadow-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by item name, SKU or batch code..."
              className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
            />
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="h-12 w-12 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowModal(true); setSubmitError(""); setForm({ quantity: "", reason: "" }); setSelectedStock(null); setStockSearch(""); setStockResults([]); }}
            className="h-12 px-5 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all flex items-center gap-2 shadow-md shadow-blue-900/20"
          >
            <Plus className="w-4 h-4" />
            New Disposal
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-800">{filtered.length}</span> disposal records
        </p>
      </nav>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Trash2 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">No disposal records</h3>
            <p className="text-sm text-gray-500 mt-1">Use "New Disposal" to record a stock write-off</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty Disposed</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Disposed By</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d, i) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{d.item_name || "-"}</p>
                        <p className="text-xs text-gray-400">{d.sku || ""}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{d.batch_code || "-"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-red-600">{d.quantity}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">{d.reason || <span className="text-gray-300 italic">—</span>}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{d.disposed_by || <span className="text-gray-300 italic">—</span>}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{formatDate(d.disposed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Disposal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Record Stock Disposal</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Stock search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">Stock Batch *</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={e => handleStockSearch(e.target.value)}
                    placeholder="Search by item name, SKU or batch..."
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                  />
                </div>
                {stockSearching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
                {stockResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {stockResults.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStock(s)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{s.item?.item_name}</p>
                          <p className="text-xs text-gray-400">Batch: {s.batch_code} · SKU: {s.item?.sku}</p>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                          {s.quantity} in stock
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedStock && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  <span className="font-semibold">Selected:</span> {selectedStock.item?.item_name} — Batch {selectedStock.batch_code}
                  <span className="ml-2 text-amber-500">({selectedStock.quantity} available)</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity to Dispose *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                  placeholder="e.g. Expired, Damaged..."
                />
              </div>

              {submitError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {submitting ? "Recording..." : "Confirm Disposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
