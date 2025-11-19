import apiClient from "../../../api/apiClient";

export const fetchStockContext = async () => {
  try {
    // Fetch batch code by skua -> pass sku
    const batchCodeRes = await apiClient.get("/api/restocks/stock-data");

    return {
      batchCodes: batchCodeRes.data,
    };
  } catch (error) {
    console.error("Error fetching stock context data:", error);
    throw error;
  }
};
