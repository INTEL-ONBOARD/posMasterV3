// utils/stockDataTransformer.js

/**
 * Transforms API response data by flattening stockData objects into individual items
 * Supports both nested format and the legacy flat stock format.
 * @param {Object} apiResponse - The original API response object
 * @returns {Array} - Array of transformed objects
 */

//converts the restock data response data from the API and returns seperate items by merging common register item objects with stock item objects
//
//eg: {regItem1{StockItem1, stockItem2, stockItem3}} ----> stockItem1Detailed1, stockItem2Detailed2, stockItem3Detailed3}
export const transformStockData = (apiResponse) => {
  if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
    console.warn('Invalid API response format');
    return [];
  }

  const data = apiResponse.data;

  // Check if data is in flat format - has direct stock fields like batch_code, quantity.
  const isFlat = data.length > 0 && data[0].batch_code !== undefined && data[0].stockData === undefined;

  if (isFlat) {
    // Transform flat stock data from the compatibility API shape.
    return data.map(item => ({
      // Item properties
      _id: item._id || item.cloud_id,
      id: item.id || item.item_id,
      stock_id: item.id, // The actual stock record ID
      item_id: item.item_id,
      stock_trace: item.stock_trace || [],
      item_name: item.item_name,
      item_image_url: item.item_image_url,
      maximum_capacity: item.maximum_capacity || 100,
      uom_id: item.uom_id,
      category_id: item.category_id,
      branch_id: item.branch_id,
      inventory_id: item.inventory_id,

      // Stock properties
      sku: item.sku,
      batch_code: item.batch_code,
      quantity: item.quantity,
      threshold_limit: item.threshold_limit || 20,
      stock_price: item.stock_price,
      retail_price: item.retail_price,
      discount_price: item.discount_price || 0,
      exp_date: item.expiry_date,
      expiry_date: item.expiry_date,
      stock_availability: item.availability,
      availability: item.availability,

      // Datetime fields
      stock_update_datetime: item.updated_at,
      stock_created_datetime: item.created_at,

      // Nested objects from JOINed data
      uom: {
        symbol: item.uom_symbol,
        unit_name: item.uom_unit_name
      },
      category: {
        brand: item.category_brand,
        type: item.category_type
      },
      inventory: null
    }));
  }

  // Transform nested format (from cloud API)
  return data.flatMap(item => {
    if (!item.stockData || !Array.isArray(item.stockData)) {
      return []; // Skip items without stockData
    }

    return item.stockData.map(stock => ({
      // Original item properties
      _id: item._id,
      id: item.id,
      stock_trace: item.stock_trace || [],
      item_name: item.item_name,
      item_image_url: item.item_image_url,
      maximum_capacity: item.maximum_capacity,
      uom_id: item.uom_id,
      category_id: item.category_id,
      inventory_id: item.inventory_id,

      // Properties from stockData with renamed fields
      sku: stock.sku,
      batch_code: stock.batch_code,
      quantity: stock.qty, // Renamed from qty to quantity
      stock_price: stock.stock_price,
      retail_price: stock.retail_price,
      discount_price: stock.discount_price,
      exp_date: stock.exp_date,
      stock_availability: stock.availability, // Renamed from availability

      // Datetime fields
      stock_update_datetime: stock.date || item.item_update_datetime,
      stock_created_datetime: stock.date || item.item_created_datetime,

      // Nested objects
      uom: item.uom || null,
      category: item.category || null,
      inventory: item.inventory || null,

      // Other properties
      __v: item.__v
    }));
  });
};

// Alternative version that returns the same structure as your example response
// export const transformStockDataWithMessage = (apiResponse) => {
//   const transformedData = transformStockData(apiResponse);
  
//   return {
//     message: apiResponse.message || "Data transformed successfully",
//     status: apiResponse.status || "success",
//     data: transformedData
//   };
// };
