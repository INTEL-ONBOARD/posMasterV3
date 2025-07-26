import React from 'react'
import ToastContext from '../pages/toasts/ToastService';

export default function validateItem(item) {

  const toast = useContext(ToastContext);

  const requiredFields = [
    'sku',
    'item_name',
    'quantity',
    'threshold_limit',
    'maximum_capacity',
    'uom_id',
    'category_id',
    'inventory_id',
    'unit_price',
    'batch_code',
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
      ['quantity', 'threshold_limit', 'maximum_capacity', 'unit_price'].includes(field) &&
      (typeof val !== 'number' || isNaN(val))
    ) {
      return false;
    }

    // check logical relationships
    if (
      item.quantity      > item.maximum_capacity ||
      item.threshold_limit > item.maximum_capacity
    ) {
      return false;
    }
  }

  return true;
}