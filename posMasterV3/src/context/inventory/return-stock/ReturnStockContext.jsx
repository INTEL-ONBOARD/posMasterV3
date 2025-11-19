import apiClient from "../../../api/apiClient";

export const fetchStockContext = async (sku) => {
  try {
    // Fetch batch code by SKU -> pass sku as parameter
    const batchCodeRes = await apiClient.get(`/api/restocks/stock-data/${sku}`);

    return {
      batchCodes: batchCodeRes.data,
    };
  } catch (error) {
    console.error("Error fetching stock context data:", error);
    throw error;
  }
};
