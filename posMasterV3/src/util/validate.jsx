import { useContext } from 'react';

export default function validateItem(item) {

  const requiredFields = [
    'sku',
    'item_name',
    'quantity',
    'threshold_limit',
    'maximum_capacity',
    'uom_id',
    'category_id',
    'inventory_id',
    'retail_price',
    'stock_price',
    //'batch_code',
    //'item_image_url',
  ];

  for (const field of requiredFields) {
    const val = item[field];

    // check null or undefined
    if (val === null || val === undefined) {
      return false;
    }

    // check strings are non-empty
    if (typeof val === 'string' && val.trim() === '') {
      return false;
    }

    // check numbers are valid
    if (
      ['quantity', 'threshold_limit', 'maximum_capacity', 'stock_price', 'retail_price'].includes(field) &&
      (typeof val !== 'number' || isNaN(val))
    ) {
      //alert("quantity and threshold validation falied");
      return false;
    }

    // check logical relationships
    if (
      item.quantity      > item.maximum_capacity 
      // || item.threshold_limit > item.maximum_capacity
    ) {
      //alert("quantity and threshold validation falied");
      return false;
    }
  }

  return true;
}