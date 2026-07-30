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

  const interpretAvailability = (item) => {
    const a = item?.availability;
    if (typeof a === "boolean") return a;
    if (typeof a === "string") return a.toLowerCase() === "true";
    return Boolean(a);
  };

  const filteredItems = inventoryItems.filter((item) => {
    const matchesCategory = searchCategory === "All" || (item?.category && item.category.type === searchCategory);
    const isAvailable = interpretAvailability(item);
    const matchesAvailability = searchAvailability === "All" ||
      (searchAvailability === "Available" && isAvailable) ||
      (searchAvailability === "Unavailable" && !isAvailable);

    // Search by item name, SKU (product code), or item_code
    const searchLower = (search || "").toLowerCase();
    const matchesSearch = searchLower === "" ||
      (item?.item_name || "").toLowerCase().includes(searchLower) ||
      (item?.sku || "").toLowerCase().includes(searchLower) ||
      (item?.item_code || "").toLowerCase().includes(searchLower) ||
      (item?.batch_code || "").toLowerCase().includes(searchLower);

    return matchesCategory && matchesAvailability && matchesSearch;
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
