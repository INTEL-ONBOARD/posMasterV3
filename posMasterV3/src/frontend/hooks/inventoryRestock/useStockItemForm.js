import { useState } from "react";
import { restockApi } from "../../api/localApi";
import { isKgUom, isLiterUom, normalizeUomSymbol } from "../../util/common/uomPricing";

// Owns the "Item Description" (formDataRegItem) and "Stock Description"
// (formDataStock) form blocks. These are always populated together
// whenever a catalog/stock row is selected (see addRegItemToForm /
// addReturnItemToForm / loadItemtoList in useRestockTransaction), so they
// share one hook, matching the original component where both pieces of
// state were always read/written side-by-side.
export function useStockItemForm() {
  const [formDataRegItem, setFormDataRegItem] = useState({

    sku: "",

    _id: "",
    id: 0,
    stock_trace: [0],
    item_name: "",
    item_image_url: "",
    maximum_capacity: 10,
    uom_id: 10,
    category_id: 10,
    inventory_id: 11,
    item_update_datetime: "2025-12-31T23:59:59",
    item_created_datetime: "2025-12-31T23:59:59",
    __v: 0,
    uom: {
      _id: "",
      id: 0,
      symbol: "",
      unit_name: "",
      __v: 0
    },
    category: {
      _id: "",
      id: 0,
      brand: "",
      type: "",
      __v: 0
    },
    inventory: null,
    availability: true
  });

  const [formDataStock, setFormDataStock] = useState({
    batch_code: "",
    quantity: 0,
    threshold_limit: 0,
    stock_price: 0,
    retail_price: 0,
    selling_price_per_kg: "",
    selling_price_per_liter: "",
    expired_datetime: null,
    availability: true,

    discount: 0
  });
  const activeUomSymbol = normalizeUomSymbol(formDataRegItem.uom?.symbol);
  const isKgSaleItem = isKgUom(activeUomSymbol);
  const isLiterSaleItem = isLiterUom(activeUomSymbol);
  const requiresMeasuredSellingRate = isKgSaleItem || isLiterSaleItem;
  //to validate and
  const [formErrors, setFormErrors] = useState({});


  //to populate recent batch code changes
  const [stockEntries, setStockEntries] = useState([]);
  // fetch stock entries for a given SKU
  const fetchStockEntries = async (sku) => {
    if (!sku) return;
    try {
      const response = await restockApi.getStockData(sku);

      if (response) {
        if (response.status === 'success' && Array.isArray(response.data)) {
          setStockEntries(response.data);
          console.log(stockEntries);
        } else if (Array.isArray(response)) {
          setStockEntries(response);
        } else if (Array.isArray(response.data)) {
          setStockEntries(response.data);
        } else {
          setStockEntries([]);
          //setStockFetchError(response.message || 'Unexpected response shape');
        }

      } else {
        setStockEntries([]);
        //setStockFetchError('Empty response from server');
      }
    } catch (err) {
      console.error('Failed to fetch stock entries for', sku, err);
      setStockEntries([]);
    }
  };
  const _setReturnBatchCodeFromEntry = () => {
    // console.log(stock);
    // setFormDataReturnItem(prev => ({ ...prev, stock: stock }));
  }
  const handleStockInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormDataStock(prev => ({ ...prev, [name]: value }));

  // clear only that field's error if present
  setFormErrors(prev => {
    if (!prev || !prev[name]) return prev;
    const next = { ...prev };
    delete next[name];
    return next;
  });

  };

  const clearFormInput = () => {
    // console.log(stock);
    // setFormDataReturnItem(prev => ({ ...prev, stock: stock }));

    setFormDataRegItem(
      {
            sku: "",

            _id: "",
            id: 0,
            stock_trace: [0],
            item_name: "",
            item_image_url: "",
            maximum_capacity: 10,
            uom_id: 10,
            category_id: 10,
            inventory_id: 11,
            item_update_datetime: "",
            item_created_datetime: "",
            __v: 0,
            uom: {
              _id: "",
              id: 0,
              symbol: "",
              unit_name: "",
              __v: 0
            },
            category: {
              _id: "",
              id: 0,
              brand: "",
              type: "",
              __v: 0
            },
            inventory: null,
            availability: true
      }
    );

    setFormDataStock(
      {
      batch_code: "",
      quantity: 0,
      threshold_limit: 0,
      stock_price: 0,
      retail_price: 0,
      selling_price_per_kg: "",
      selling_price_per_liter: "",
      expired_datetime: null,
      availability: true,

      discount: 0
      }
    );
  }

  return {
    formDataRegItem,
    setFormDataRegItem,
    formDataStock,
    setFormDataStock,
    activeUomSymbol,
    isKgSaleItem,
    isLiterSaleItem,
    requiresMeasuredSellingRate,
    formErrors,
    setFormErrors,
    stockEntries,
    setStockEntries,
    fetchStockEntries,
    _setReturnBatchCodeFromEntry,
    handleStockInputChange,
    clearFormInput,
  };
}
