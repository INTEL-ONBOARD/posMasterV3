import apiClient from "../../../api/apiClient";

export const fetchCommonData = async () => {
  try {
    // Fetch items
    const itemsRes = await apiClient.get("/api/itemRegistry/extended");

    // Fetch categories
    const categoriesRes = await apiClient.get("/api/categories");

    const rawCategories = categoriesRes.data.data; // because your API wraps it

    // Deduplicate categories based on brand + type
    const uniqueCategories = Array.from(
      new Map(
        rawCategories.map((c) => [`${c.brand.toLowerCase()}|${c.type.toLowerCase()}`, c])
      ).values()
    );

    return {
      items: itemsRes.data,
      categories: uniqueCategories,
    };
  } catch (error) {
    console.error("Error fetching common data:", error);
    throw error;
  }
};
