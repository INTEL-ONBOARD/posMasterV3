import { useState } from "react";

// Owns the "Supplier" form block state (supplier selection, invoice/bill
// numbers, payment method, expenses, bank account fields) used in the
// restock left panel.
export function useSupplierForm() {
  // NOTE: the original component initialized `invoice_no` from the
  // `invoiceNo` piece of state declared earlier in the same render.
  // Since that state itself starts as "" and effects (which regenerate it)
  // only run after the first render commits, `invoiceNo` is always ""
  // at the moment this initial state is built — so hard-coding "" here is
  // exactly equivalent, without requiring this hook to depend on the
  // transaction hook's invoice number state.
  const [formDataSupplier, setFormDataSupplier] = useState({
    id: 0,
    supplier_name: "",
    type: "",
    supplier_address: "",
    status: false,
    contact: "",

    current_amount: 0,
    previous_amount: 0,

    invoice_no: "",
    bill_no: "",

    payment_method: "",
    expenses: 0,

    account_name: "",
    account_nickName: "",
    account_related_bank: "",
    account_number: "",
    account_related_branch: "",
  });

  const handleSupplierInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormDataSupplier(prev => ({ ...prev, [name]: value }));
  };

  return { formDataSupplier, setFormDataSupplier, handleSupplierInputChange };
}
