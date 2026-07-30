import { useMemo, useState } from "react";
import { useScannerSearch } from "../useScannerSearch";

// Builds a normalized display item from a raw stock record, merging the
// nested `item` (and its category/uom) with top-level stock fields so
// SalesItemCard and the dispose/return lists always have consistent
// name/sku/category/uom/quantity values regardless of which shape the
// record arrived in.
//
// NOTE: this used to be defined twice in InventoryRestock.jsx (once at
// module scope, once inside the component) with byte-identical bodies —
// the module-scope copy was always shadowed by the inner one and was
// therefore unreachable dead code. Only one copy is kept here; behavior is
// unchanged since the dead copy never executed.
export const buildDisposeDisplayItem = (stock = {}) => {
  const nestedItem = stock?.item && typeof stock.item === "object" ? stock.item : {};
  const nestedCategory = nestedItem.category && typeof nestedItem.category === "object" ? nestedItem.category : {};
  const topLevelCategory = stock?.category && typeof stock.category === "object" ? stock.category : {};
  const nestedUom = nestedItem.uom && typeof nestedItem.uom === "object" ? nestedItem.uom : {};
  const topLevelUom = stock?.uom && typeof stock.uom === "object" ? stock.uom : {};

  const displayName =
    nestedItem.item_name ??
    nestedItem.itemName ??
    nestedItem.name ??
    stock.item_name ??
    stock.itemName ??
    stock.name ??
    "Unknown Item";

  const displaySku =
    nestedItem.sku ??
    nestedItem.item_sku ??
    nestedItem.itemCode ??
    stock.sku ??
    stock.item_sku ??
    stock.itemCode ??
    "Unknown SKU";

  const displayCategory = {
    ...topLevelCategory,
    ...nestedCategory,
    type:
      nestedCategory.type ??
      nestedCategory.category_type ??
      topLevelCategory.type ??
      topLevelCategory.category_type ??
      stock.category_type ??
      stock.categoryType ??
      "Unknown",
    brand:
      nestedCategory.brand ??
      nestedCategory.category_brand ??
      topLevelCategory.brand ??
      topLevelCategory.category_brand ??
      stock.category_brand ??
      stock.categoryBrand ??
      "Unknown",
  };

  const displayUom = {
    ...topLevelUom,
    ...nestedUom,
    symbol:
      nestedUom.symbol ??
      topLevelUom.symbol ??
      stock.uom_symbol ??
      stock.uomSymbol ??
      "unit",
  };

  return {
    ...stock,
    ...nestedItem,
    id: stock.id ?? stock._id ?? stock.stock_id ?? nestedItem.id ?? nestedItem._id ?? nestedItem.stock_id ?? null,
    stock_id: stock.stock_id ?? stock.id ?? stock._id ?? nestedItem.stock_id ?? nestedItem.id ?? nestedItem._id ?? null,
    sku: displaySku,
    item_name: displayName,
    category: displayCategory,
    uom: displayUom,
    quantity: stock.quantity ?? nestedItem.quantity ?? 0,
    batch_code: stock.batch_code ?? nestedItem.batch_code ?? "",
    item_image_url: stock.item_image_url ?? nestedItem.item_image_url ?? stock.image ?? nestedItem.image ?? "",
    retail_price: stock.retail_price ?? nestedItem.retail_price ?? stock.stock_price ?? nestedItem.stock_price ?? 0,
    stock_price: stock.stock_price ?? nestedItem.stock_price ?? 0,
    threshold_limit: stock.threshold_limit ?? nestedItem.threshold_limit ?? 0,
    maximum_capacity: stock.maximum_capacity ?? nestedItem.maximum_capacity ?? 100,
  };
};

// Owns the search/filter UI state (search text, category, availability),
// wires up scanner-aware search handling, and computes every derived item
// list the restock "add" / "dispose" / "return" browsers need.
export function useRestockDerivedData({ itemCategories, stockItems, inventoryItems }) {
  // Derive unique category types from reactive data
  const uniqueCategoryTypes = useMemo(() => {
    if (!itemCategories || itemCategories.length === 0) return [];
    return Array.from(new Set(itemCategories.map(c => c.type)));
  }, [itemCategories]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");
  const { handleSearch, handleSearchKeyDown } = useScannerSearch({
    setSearch,
    setSearchLoading
  });

  // Aggregate stock batches by SKU so the add panel can show the same
  // branch-aware quantity totals as the inventory view.
  const stockSummaryBySku = useMemo(() => {
    const itemMap = new Map();

    (stockItems || []).forEach((stock) => {
      const sku = stock?.sku || stock?.item?.sku;
      if (!sku) return;

      const sourceItem = stock?.item || {};
      const quantity = Number(stock?.quantity) || 0;
      const existing = itemMap.get(sku);

      if (existing) {
        existing.quantity += quantity;
        existing.batchCount += 1;

        if ((Number(stock?.retail_price) || 0) > (Number(existing.retail_price) || 0)) {
          existing.retail_price = stock?.retail_price;
          existing.stock_price = stock?.stock_price;
          existing.discount_price = stock?.discount_price;
          existing.batch_code = stock?.batch_code;
        }

        if (!existing.item_image_url && (stock?.item_image_url || sourceItem?.item_image_url)) {
          existing.item_image_url = stock?.item_image_url || sourceItem?.item_image_url;
        }

        if (!existing.maximum_capacity && stock?.maximum_capacity) {
          existing.maximum_capacity = stock.maximum_capacity;
        }

        if (existing.threshold_limit == null && stock?.threshold_limit != null) {
          existing.threshold_limit = stock.threshold_limit;
        }

        return;
      }

      itemMap.set(sku, {
        id: stock?.item_id ?? sourceItem?.id ?? stock?.id,
        item_id: stock?.item_id ?? sourceItem?.id ?? null,
        stock_id: stock?.id,
        sku,
        item_code: stock?.item_code || sourceItem?.item_code || null,
        item_name: stock?.item_name || sourceItem?.item_name,
        item_image_url: stock?.item_image_url || sourceItem?.item_image_url,
        maximum_capacity: stock?.maximum_capacity ?? sourceItem?.maximum_capacity,
        batch_code: stock?.batch_code,
        quantity,
        threshold_limit: stock?.threshold_limit ?? sourceItem?.threshold_limit ?? 0,
        stock_price: stock?.stock_price ?? 0,
        retail_price: stock?.retail_price ?? 0,
        discount_price: stock?.discount_price ?? 0,
        expiry_date: stock?.expiry_date,
        availability: stock?.availability,
        batchCount: 1,
        category: stock?.item?.category || stock?.category || {
          id: stock?.category_id,
          brand: stock?.category_brand,
          type: stock?.category_type,
        },
        uom: stock?.item?.uom || stock?.uom || {
          id: stock?.uom_id,
          symbol: stock?.uom_symbol,
          unit_name: stock?.uom_unit_name,
        },
      });
    });

    return itemMap;
  }, [stockItems]);

  // Registered catalog items for restock/add mode, enriched with the summed
  // stock state for the current branch so cards display the real quantity.
  const filteredAddItems = useMemo(() => {
    if (!inventoryItems || inventoryItems.length === 0) return [];

    const searchTerm = (search || "").toLowerCase();

    return inventoryItems
      .map((item) => {
        const sku = item?.sku || item?.item?.sku;
        const stockSummary = sku ? stockSummaryBySku.get(sku) : null;
        const mergedCategory = {
          id: item?.category?.id ?? item?.category?._id ?? stockSummary?.category?.id ?? stockSummary?.category?._id ?? null,
          brand: item?.category?.brand ?? stockSummary?.category?.brand ?? "",
          type: item?.category?.type ?? stockSummary?.category?.type ?? "",
        };
        const mergedUom = {
          id: item?.uom?.id ?? item?.uom?._id ?? stockSummary?.uom?.id ?? stockSummary?.uom?._id ?? null,
          symbol: item?.uom?.symbol ?? stockSummary?.uom?.symbol ?? "",
          unit_name: item?.uom?.unit_name ?? stockSummary?.uom?.unit_name ?? "",
        };

        return {
          ...item,
          id: item?.id ?? item?._id ?? stockSummary?.id ?? stockSummary?.stock_id ?? sku,
          item_id: item?.item_id ?? stockSummary?.item_id ?? item?.id ?? item?._id ?? null,
          stock_id: stockSummary?.stock_id ?? item?.stock_id ?? null,
          sku: sku || stockSummary?.sku || "",
          item_code: item?.item_code ?? stockSummary?.item_code ?? null,
          item_name: item?.item_name ?? stockSummary?.item_name ?? "",
          item_image_url: item?.item_image_url ?? stockSummary?.item_image_url ?? "",
          maximum_capacity: item?.maximum_capacity ?? stockSummary?.maximum_capacity ?? 100,
          batch_code: item?.batch_code ?? stockSummary?.batch_code ?? "",
          quantity: stockSummary?.quantity ?? item?.quantity ?? 0,
          threshold_limit: item?.threshold_limit ?? stockSummary?.threshold_limit ?? 20,
          stock_price: item?.stock_price ?? stockSummary?.stock_price ?? 0,
          retail_price: item?.retail_price ?? stockSummary?.retail_price ?? 0,
          discount_price: item?.discount_price ?? stockSummary?.discount_price ?? 0,
          availability: item?.availability ?? stockSummary?.availability,
          batchCount: stockSummary?.batchCount ?? 0,
          category: mergedCategory,
          uom: mergedUom,
        };
      })
      .filter((item) => {
        // Category match: either "All" or item.category.type equals selected
        const matchesCategory =
          searchCategory === "All" ||
          (item?.category && item.category.type === searchCategory);

        // Item name or batch code text search match
        const matchesSearch =
          (item?.item_name || "").toLowerCase().includes(searchTerm) ||
          (item?.batch_code || "").toLowerCase().includes(searchTerm) ||
          (item?.sku || "").toLowerCase().includes(searchTerm);

        return matchesCategory && matchesSearch;
      });
  }, [inventoryItems, stockSummaryBySku, searchCategory, search]);

  // Stock batches for restock (add) mode — items that have existing stock records
  const filteredRestockItems = useMemo(() => {
    if (!stockItems || stockItems.length === 0) return [];
    const searchTerm = (search || "").toLowerCase();
    return stockItems.filter((stock) => {
      const displayItem = buildDisposeDisplayItem(stock);
      const matchesCategory =
        searchCategory === "All" ||
        (displayItem.category?.type === searchCategory);
      const matchesSearch =
        (displayItem.item_name || "").toLowerCase().includes(searchTerm) ||
        (displayItem.batch_code || "").toLowerCase().includes(searchTerm) ||
        (displayItem.sku || "").toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    });
  }, [stockItems, searchCategory, search]);

  // Stock batches with actual quantity > 0, for dispose mode
  const filteredDisposeItems = useMemo(() => {
    if (!stockItems || stockItems.length === 0) return [];
    const searchTerm = (search || "").toLowerCase();
    return stockItems.filter((stock) => {
      const displayItem = buildDisposeDisplayItem(stock);
      if ((displayItem.quantity ?? 0) <= 0) return false;
      const matchesCategory =
        searchCategory === "All" ||
        (displayItem.category?.type === searchCategory);
      const matchesSearch =
        (displayItem.item_name || "").toLowerCase().includes(searchTerm) ||
        (displayItem.batch_code || "").toLowerCase().includes(searchTerm) ||
        (displayItem.sku || "").toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    });
  }, [stockItems, searchCategory, search]);

  return {
    uniqueCategoryTypes,
    searchLoading,
    search,
    setSearch,
    searchCategory,
    setSearchCategory,
    searchAvailability,
    setSearchAvailability,
    handleSearch,
    handleSearchKeyDown,
    stockSummaryBySku,
    filteredAddItems,
    filteredRestockItems,
    filteredDisposeItems,
    buildDisposeDisplayItem,
  };
}
