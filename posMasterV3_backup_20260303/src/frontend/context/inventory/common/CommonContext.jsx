import { itemApi, categoryApi } from "../../../api/localApi";

export const fetchCommonData = async () => {
  try {
    // Fetch items
    const itemsRes = await itemApi.getAllExtended();

    // Fetch categories
    const categoriesRes = await categoryApi.getAll();

    const rawCategories = categoriesRes.data || []; // because your API wraps it

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
