import { useState } from "react";

// Owns the "Dispose" form block state used when a dispose-mode item is
// selected in the restock right panel. The actual submit action
// (addDisposeItem) lives in useRestockTransaction since it also needs the
// transaction's prepared-by id, the shared status modal, and the item-form
// clear function.
export function useDisposeItemForm() {
  // Dispose item form state
  const [disposeItemSelected, setDisposeItemSelected] = useState(false);
  const [formDataDisposeItem, setFormDataDisposeItem] = useState({
    stock_id: "",
    quantity: "",
    reason: "",
  });
  const [formDisposeErrors, setFormDisposeErrors] = useState({});

  const handleDisposeItemInputChange = (e) => {
    const { name, value } = e.target;
    setFormDataDisposeItem(prev => ({ ...prev, [name]: value }));
    setFormDisposeErrors(prev => {
      if (!prev || !prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  return {
    disposeItemSelected,
    setDisposeItemSelected,
    formDataDisposeItem,
    setFormDataDisposeItem,
    formDisposeErrors,
    setFormDisposeErrors,
    handleDisposeItemInputChange,
  };
}
