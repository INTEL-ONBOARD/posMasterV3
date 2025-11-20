// utils/stockDataTransformer.js

/**
 * Transforms API response data by flattening stockData objects into individual items
 * @param {Object} apiResponse - The original API response object
 * @returns {Array} - Array of transformed objects
 */
export const transformStockData = (apiResponse) => {
  if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
    console.warn('Invalid API response format');
    return [];
  }

  return apiResponse.data.flatMap(item => {
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