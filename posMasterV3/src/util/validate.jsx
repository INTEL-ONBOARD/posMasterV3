import { useContext } from 'react';


// utils/stockValidation.js
export function validateStockForm(formDataStock = {}) {
  const formErrors = {};

  const batch = (formDataStock.batch_code || "").toString().trim();
  if (!batch) {
    formErrors.batch_code = "Batch code is required.";
  }

  const quantity = parseFloat(formDataStock.quantity);
  if (Number.isNaN(quantity) || quantity <= 0) {
    formErrors.quantity = "Quantity must be greater than 0.";
  }

  const threshold = parseFloat(formDataStock.threshold_limit);
  if (Number.isNaN(threshold) || threshold < 0) {
    formErrors.threshold_limit = "Threshold limit must be 0 or greater.";
  }

  const stockPrice = parseFloat(formDataStock.stock_price);
  if (Number.isNaN(stockPrice) || stockPrice <= 0) {
    formErrors.stock_price = "Stock price must be greater than 0.";
  }

  const retailPrice = parseFloat(formDataStock.retail_price);
  if (Number.isNaN(retailPrice) || retailPrice <= 0) {
    formErrors.retail_price = "Retail price must be greater than 0.";
  }

  if (!formDataStock.expired_datetime) {
    formErrors.expired_datetime = "Expiration date is required.";
  } else {
    const d = new Date(formDataStock.expired_datetime);
    if (Number.isNaN(d.getTime())) {
      formErrors.expired_datetime = "Invalid expiration date.";
    }
    // optional future-check:
    // else if (d < new Date()) { formErrors.expired_datetime = "Expiration date must be in the future."; }
  }

  const discount = parseFloat(formDataStock.discount);
  if (!Number.isNaN(discount) && discount < 0) {
    formErrors.discount = "Discount cannot be negative.";
  }

  if (formDataStock.availability === "" || formDataStock.availability === undefined) {
    formErrors.availability = "Please select availability.";
  }

  const valid = Object.keys(formErrors).length === 0;
  return { valid, formErrors };
}





export function validateItem(item) {

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