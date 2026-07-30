import { useState } from "react";

// Owns the "Return" form block state used when a return-mode item is
// selected in the restock right panel.
export function useReturnItemForm() {
  const [formDataReturnItem, setFormDataReturnItem] = useState({
    sku: "",

    stock_price: 0,
    retail_price: 0,


    batch_code: "",
    quantity: 0,
    return_description: ""
  });
  const [formReturnErrors, setFormReturnErrors] = useState({});

  const handleReturnItemInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormDataReturnItem(prev => ({ ...prev, [name]: value }));


  // Clear error for this field if present
  setFormReturnErrors(prev => {
    if (!prev || !prev[name]) return prev;
    const next = { ...prev };
    delete next[name];
    return next;
  });

  };

  //to make left section's return item block visible only after selecting a return item from the table
  const [returnItemSelected, setReturnItemSelected] = useState(false);

  return {
    formDataReturnItem,
    setFormDataReturnItem,
    formReturnErrors,
    setFormReturnErrors,
    handleReturnItemInputChange,
    returnItemSelected,
    setReturnItemSelected,
  };
}
