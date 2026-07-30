import { useMemo, useState } from "react";
import { useScannerSearch } from "./useScannerSearch";

/**
 * Item search/filter state for the sales terminal's item picker panel:
 * search text (with scanner-aware debounce via useScannerSearch), category
 * filter, availability filter, and the resulting filtered item list.
 */
export function useItemSearch({ inventoryItems, categoriesData }) {
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability] = useState("All");

  const { handleSearch, handleSearchKeyDown } = useScannerSearch({
    setSearch,
    setSearchLoading
  });

  // Extract unique category types
  const uniqueCategoryTypes = useMemo(() => {
    return Array.from(new Set((categoriesData || []).map(c => c.type)));
  }, [categoriesData]);

  // A tile is sellable only if its batch actually holds stock. The stored
  // `availability` flag can't be trusted for this — empty placeholder
  // batches (e.g. INIT-*) ship with availability:true and quantity 0 — so
  // we gate on real quantity instead. This is what keeps out-of-stock items
  // and empty batches out of the cashier's reach entirely, rather than
  // letting them be added and then rejected at checkout.
  const hasSellableStock = (item) => Number(item?.quantity ?? item?.qty ?? 0) > 0;

  const filteredItems = inventoryItems.filter((item) => {
    const matchesCategory = searchCategory === "All" || (item?.category && item.category.type === searchCategory);

    // Search by item name, SKU (product code), or item_code
    const searchLower = (search || "").toLowerCase();
    const matchesSearch = searchLower === "" ||
      (item?.item_name || "").toLowerCase().includes(searchLower) ||
      (item?.sku || "").toLowerCase().includes(searchLower) ||
      (item?.item_code || "").toLowerCase().includes(searchLower) ||
      (item?.batch_code || "").toLowerCase().includes(searchLower);

    return matchesCategory && hasSellableStock(item) && matchesSearch;
  });

  return {
    search,
    setSearch,
    searchCategory,
    setSearchCategory,
    searchAvailability,
    searchLoading,
    uniqueCategoryTypes,
    filteredItems,
    handleSearch,
    handleSearchKeyDown
  };
}
