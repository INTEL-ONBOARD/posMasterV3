import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Package2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import Badge from "./Badge.jsx";
import SectionShell from "./SectionShell.jsx";
import ShareItemCard from "./ShareItemCard.jsx";
import { branchDisplayName, branchIdValue, branchName } from "../utils/transferHelpers";

export default function OutgoingShareTab({
  currentBranch,
  branches,
  inventoryItems,
  outgoingHistory,
  outgoingSearch,
  setOutgoingSearch,
  outgoingCategory,
  setOutgoingCategory,
  onSendTransfer,
  sending,
  filteredOutgoingItems,
  loading,
}) {
  const [selectedItemsList, setSelectedItemsList] = useState([]);
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [cartError, setCartError] = useState("");

  const categoryOptions = useMemo(
    () => Array.from(new Set(inventoryItems.map((item) => item?.category?.type).filter(Boolean))),
    [inventoryItems]
  );

  const selectedItemIds = useMemo(
    () => new Set(selectedItemsList.map((item) => String(item.id))),
    [selectedItemsList]
  );

  const selectedItemsTotalQty = useMemo(
    () => selectedItemsList.reduce((sum, item) => sum + (Number(item.transferQty) || 0), 0),
    [selectedItemsList]
  );

  const destinationBranches = useMemo(
    () => branches.filter((branch) => branchIdValue(branch) !== String(currentBranch?.id ?? currentBranch?.branch_id ?? "")),
    [branches, currentBranch]
  );

  useEffect(() => {
    if (!destinationBranches.length) {
      setDestinationBranchId("");
      return;
    }

    setDestinationBranchId((prev) => {
      if (prev && destinationBranches.some((branch) => branchIdValue(branch) === String(prev))) {
        return prev;
      }
      return branchIdValue(destinationBranches[0]);
    });
  }, [destinationBranches]);

  useEffect(() => {
    setSelectedItemsList((prev) =>
      prev.map((cartItem) => {
        if (cartItem.transferQty === "") return cartItem;

        const sourceItem = inventoryItems.find((item) => String(item.id) === String(cartItem.id));
        if (!sourceItem) return cartItem;

        const availableQty = Math.max(1, Number(sourceItem.quantity) || 1);
        const transferQty = String(Math.min(Math.max(Number(cartItem.transferQty) || 1, 1), availableQty));
        return { ...cartItem, transferQty };
      })
    );
  }, [inventoryItems]);

  const addItemToCart = (item) => {
    setSelectedItemsList((prev) => {
      if (prev.some((entry) => String(entry.id) === String(item.id))) return prev;
      setCartError("");
      return [...prev, { ...item, transferQty: "1" }];
    });
  };

  const removeItemFromCart = (itemId) => {
    setSelectedItemsList((prev) => prev.filter((item) => String(item.id) !== String(itemId)));
    setCartError("");
  };

  const updateCartQuantity = (itemId, value) => {
    setCartError("");
    const rawValue = String(value ?? "");
    const sanitizedValue = rawValue.replace(/[^\d]/g, "");

    setSelectedItemsList((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(itemId)) return item;
        if (rawValue === "") {
          return { ...item, transferQty: "" };
        }

        const availableQty = Math.max(1, Number(item.quantity) || 1);
        const parsed = Number(sanitizedValue);
        if (!Number.isFinite(parsed)) {
          return item;
        }

        const transferQty = String(Math.min(Math.max(parsed, 1), availableQty));
        return { ...item, transferQty };
      })
    );
  };

  useEffect(() => {
    console.groupCollapsed("[OutgoingShareTab] Render debug");
    console.log("currentBranch", currentBranch);
    console.log("inventoryItems", inventoryItems);
    console.log("filteredOutgoingItems", filteredOutgoingItems);
    console.groupEnd();
  }, [currentBranch, filteredOutgoingItems, inventoryItems]);

  const handleBulkSend = async () => {
    setCartError("");

    if (!selectedItemsList.length) {
      setCartError("Please add at least one item to the cart.");
      return;
    }

    if (!destinationBranchId) {
      setCartError("Please select a destination branch.");
      return;
    }

    if (String(destinationBranchId) === String(branchIdValue(currentBranch))) {
      setCartError("You cannot share inventory with the same branch.");
      return;
    }

    const invalidItem = selectedItemsList.find((item) => {
      const availableQty = Number(item.quantity) || 0;
      const qty = Number(item.transferQty) || 0;
      return qty <= 0 || qty > availableQty;
    });

    if (invalidItem) {
      setCartError(`Invalid quantity for ${invalidItem.item_name}.`);
      return;
    }

    try {
      await onSendTransfer(selectedItemsList, destinationBranchId, transferNote);
      setSelectedItemsList([]);
      setTransferNote("");
      setCartError("");
    } catch (error) {
      // Parent handles the failure toast.
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <SectionShell
          showHeader={false}
          bodyClassName="p-4"
          className="flex h-full min-h-0 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 pr-1">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={outgoingSearch}
                  onChange={(e) => setOutgoingSearch(e.target.value)}
                  placeholder="Search items by name or SKU..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#1A318C] focus:bg-white"
                />
              </div>
              <select
                value={outgoingCategory}
                onChange={(e) => setOutgoingCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#1A318C] focus:bg-white"
              >
                <option value="All">All Categories</option>
                {categoryOptions.map((category, index) => (
                  <option key={`${category || "category"}-${index}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {loading ? (
                <div className="flex min-h-0 h-full items-center justify-center py-24">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
                </div>
              ) : filteredOutgoingItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
                  <Package2 className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-base font-semibold text-slate-700">No items found</p>
                  <p className="mt-1 text-sm text-slate-500">Try changing the search or category filter.</p>
                </div>
              ) : (
                <div className="h-full min-h-0 overflow-y-auto pb-4 pr-1 [scrollbar-gutter:stable]">
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredOutgoingItems.map((item, index) => (
                      <ShareItemCard
                        key={`${item.id || item.sku || item.batch_code || "item"}-${index}`}
                        item={item}
                        isAdded={selectedItemIds.has(String(item.id))}
                        onAdd={addItemToCart}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionShell>

        <SectionShell
          showHeader={false}
          bodyClassName="p-4"
          className="flex h-full min-h-0 flex-col"
        >
          <div className="flex h-full min-h-0 flex-col space-y-4">
            {cartError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {cartError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Items</p>
                  <h4 className="text-lg font-bold text-slate-800">{selectedItemsList.length} item(s)</h4>
                </div>
                <Badge tone="blue">Total Qty: {selectedItemsTotalQty}</Badge>
              </div>

              <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
                {selectedItemsList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                    <Package2 className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">Add items from the left panel</p>
                    <p className="mt-1 text-xs text-slate-500">Your transfer cart will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItemsList.map((item, index) => (
                      <div
                        key={`${item.id || item.sku || item.batch_code || "cart-item"}-${index}`}
                        className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Package2 className="h-4 w-4 shrink-0 text-[#1A318C]" />
                            <p className="truncate text-sm font-semibold text-slate-800">{item.item_name}</p>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{item.sku}</p>
                        </div>

                        <div className="w-28 shrink-0">
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Transfer Qty
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="1"
                            max={Number(item.quantity) || 1}
                            value={item.transferQty ?? ""}
                            onChange={(e) => updateCartQuantity(item.id, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A318C]"
                          />
                        </div>

                        <div className="shrink-0 self-end pb-[2px]">
                          <button
                            type="button"
                            onClick={() => removeItemFromCart(item.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                          >
                            <XCircle className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Destination Branch</label>
                <select
                  value={destinationBranchId}
                  onChange={(e) => {
                    setDestinationBranchId(e.target.value);
                    setCartError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1A318C]"
                >
                  <option value="">Select branch</option>
                  {destinationBranches.map((branch, index) => (
                    <option key={`${branch.id || branch.branch_id || branch.branchId || branch.code || "branch"}-${index}`} value={branch.id}>
                      {branchDisplayName(branch)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Transfer Note</label>
                <textarea
                  rows={4}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Optional note to accompany the share request..."
                  className="h-full w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1A318C]"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={sending || selectedItemsList.length === 0 || !destinationBranchId}
              onClick={handleBulkSend}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A318C] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#152a79] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Send Share Requests
            </button>

            <div className="rounded-2xl bg-[#1A318C]/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1A318C]">Quick Summary</p>
                <Badge tone="blue">{outgoingHistory.length} sent</Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-medium text-slate-400">Current Branch</p>
                  <p className="mt-1 font-semibold text-slate-800">{branchDisplayName(currentBranch)}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-medium text-slate-400">Destination</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {branchName(branches, destinationBranchId) || "Not selected"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionShell>
      </div>

    </div>
  );
}
