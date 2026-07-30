import React, { useState } from "react";
import { useReactiveData, TABLES } from "../../store";
import StatusModal from "../../components/StatusModal.jsx";

import { useRestockDerivedData } from "../../hooks/inventoryRestock/useRestockDerivedData";
import { useSupplierForm } from "../../hooks/inventoryRestock/useSupplierForm";
import { useStockItemForm } from "../../hooks/inventoryRestock/useStockItemForm";
import { useReturnItemForm } from "../../hooks/inventoryRestock/useReturnItemForm";
import { useDisposeItemForm } from "../../hooks/inventoryRestock/useDisposeItemForm";
import { useRestockTransaction } from "../../hooks/inventoryRestock/useRestockTransaction";

import RestockLeftPanel from "./sections/RestockLeftPanel";
import RestockTransactionHeader from "./sections/RestockTransactionHeader";
import RestockItemsTable from "./sections/RestockItemsTable";
import RestockAmountsSummary from "./sections/RestockAmountsSummary";
import RestockActionButtons from "./sections/RestockActionButtons";
import RestockItemsBrowser from "./sections/RestockItemsBrowser";

// InventoryRestock composes the restock/dispose/return workflow out of:
//   - useRestockDerivedData: search/filter state + derived item lists
//   - useSupplierForm / useStockItemForm / useReturnItemForm /
//     useDisposeItemForm: per-section form state (see hooks/inventoryRestock)
//   - useRestockTransaction: cross-section orchestration (adding items to
//     the transaction list, loading a row back into the form, disposing an
//     item, submitting the transaction, the success/fail modal)
// `rightActiveSection` (buttons | add | dispose | return) drives which
// right-panel section renders; `openFormBlock` drives which left-panel
// accordion block is open. Both stay here since they're read by more than
// one child and by useRestockTransaction.
function InventoryRestock({ isActive }) {
  // Use reactive data hooks for suppliers, users, items, and categories
  const { data: suppliers } = useReactiveData(
    TABLES.SUPPLIERS,
    null,
    { enabled: isActive }
  );

  const { data: users } = useReactiveData(
    TABLES.USERS,
    null,
    { enabled: isActive }
  );

  const { data: inventoryItems, loading: isLoading } = useReactiveData(
    TABLES.ITEMS,
    null,
    { enabled: isActive }
  );

  const { data: stockItems } = useReactiveData(
    TABLES.STOCK,
    null,
    { enabled: isActive }
  );

  const { data: itemCategories } = useReactiveData(
    TABLES.CATEGORIES,
    null,
    { enabled: isActive }
  );

  // right section controls
  const [rightActiveSection, setRightActiveSection] = useState("buttons"); // "buttons" | "dispose" | "add" | "return"

  // left section controls
  const [openFormBlock, setopenFormBlock] = useState('item'); //item || stock || supplier ||

  const derivedData = useRestockDerivedData({ itemCategories, stockItems, inventoryItems });
  const supplierForm = useSupplierForm();
  const stockItemForm = useStockItemForm();
  const returnItemForm = useReturnItemForm();
  const disposeItemForm = useDisposeItemForm();

  const transaction = useRestockTransaction({
    isActive,
    rightActiveSection,
    setRightActiveSection,
    setopenFormBlock,
    buildDisposeDisplayItem: derivedData.buildDisposeDisplayItem,

    formDataRegItem: stockItemForm.formDataRegItem,
    setFormDataRegItem: stockItemForm.setFormDataRegItem,
    formDataStock: stockItemForm.formDataStock,
    setFormDataStock: stockItemForm.setFormDataStock,
    setFormErrors: stockItemForm.setFormErrors,
    clearFormInput: stockItemForm.clearFormInput,
    setStockEntries: stockItemForm.setStockEntries,
    fetchStockEntries: stockItemForm.fetchStockEntries,

    formDataReturnItem: returnItemForm.formDataReturnItem,
    setFormDataReturnItem: returnItemForm.setFormDataReturnItem,
    setFormReturnErrors: returnItemForm.setFormReturnErrors,
    returnItemSelected: returnItemForm.returnItemSelected,
    setReturnItemSelected: returnItemForm.setReturnItemSelected,

    formDataDisposeItem: disposeItemForm.formDataDisposeItem,
    setFormDataDisposeItem: disposeItemForm.setFormDataDisposeItem,
    setFormDisposeErrors: disposeItemForm.setFormDisposeErrors,
    setDisposeItemSelected: disposeItemForm.setDisposeItemSelected,

    formDataSupplier: supplierForm.formDataSupplier,
    setFormDataSupplier: supplierForm.setFormDataSupplier,
  });

  return (

    <div className="flex bg-gray-50 w-full h-[calc(100vh-2rem)] relative overflow-y-auto pb-24">
      {/* form section (left) */}
      <RestockLeftPanel
        openFormBlock={openFormBlock}
        setopenFormBlock={setopenFormBlock}
        formDataSupplier={supplierForm.formDataSupplier}
        handleSupplierInputChange={supplierForm.handleSupplierInputChange}
        suppliers={suppliers}
        transactionErrors={transaction.transactionErrors}
        setTransactionData={transaction.setTransactionData}
        setTransactionErrors={transaction.setTransactionErrors}
        formDataRegItem={stockItemForm.formDataRegItem}
        formDataStock={stockItemForm.formDataStock}
        setFormDataStock={stockItemForm.setFormDataStock}
        formErrors={stockItemForm.formErrors}
        handleStockInputChange={stockItemForm.handleStockInputChange}
        requiresMeasuredSellingRate={stockItemForm.requiresMeasuredSellingRate}
        isKgSaleItem={stockItemForm.isKgSaleItem}
        stockEntries={stockItemForm.stockEntries}
        setStockBatchCodeFromEntry={transaction.setStockBatchCodeFromEntry}
        returnItemSelected={returnItemForm.returnItemSelected}
        formDataReturnItem={returnItemForm.formDataReturnItem}
        handleReturnItemInputChange={returnItemForm.handleReturnItemInputChange}
        formReturnErrors={returnItemForm.formReturnErrors}
        disposeItemSelected={disposeItemForm.disposeItemSelected}
        formDataDisposeItem={disposeItemForm.formDataDisposeItem}
        handleDisposeItemInputChange={disposeItemForm.handleDisposeItemInputChange}
        formDisposeErrors={disposeItemForm.formDisposeErrors}
        clearFormInput={stockItemForm.clearFormInput}
        setReturnItemSelected={returnItemForm.setReturnItemSelected}
        setDisposeItemSelected={disposeItemForm.setDisposeItemSelected}
        setFormDataDisposeItem={disposeItemForm.setFormDataDisposeItem}
        setFormDisposeErrors={disposeItemForm.setFormDisposeErrors}
        setStockEntries={stockItemForm.setStockEntries}
        addDisposeItem={transaction.addDisposeItem}
        addNewRegItem={transaction.addNewRegItem}
      />

      {/* main transaction section (mid) with loading state and content*/}
      <div className="flex-1 h-[calc(100vh-2rem)] flex flex-col min-h-0">
        {/* supplier details section*/}
        <RestockTransactionHeader
          transactionData={transaction.transactionData}
          setTransactionData={transaction.setTransactionData}
          transactionErrors={transaction.transactionErrors}
          setTransactionErrors={transaction.setTransactionErrors}
          handleTransactionDataInputChange={transaction.handleTransactionDataInputChange}
          users={users}
          invoiceGenerate={transaction.invoiceGenerate}
          setInvoiceGenerate={transaction.setInvoiceGenerate}
          registerTransaction={transaction.registerTransaction}
        />
        {/* table section*/}
        <RestockItemsTable
          selectedStockItemList={transaction.selectedStockItemList}
          selectedReturnItemList={transaction.selectedReturnItemList}
          formDataRegItem={stockItemForm.formDataRegItem}
          returnItemSelected={returnItemForm.returnItemSelected}
          addRegItemToForm={transaction.addRegItemToForm}
          addReturnItemToForm={transaction.addReturnItemToForm}
          removeStockItemFromList={transaction.removeStockItemFromList}
          removeReturnItemFromList={transaction.removeReturnItemFromList}
        />
        {/* amount section */}
        <RestockAmountsSummary
          stockTotal={transaction.stockTotal}
          returnTotal={transaction.returnTotal}
          finalDiscount={transaction.finalDiscount}
          setFinalDiscount={transaction.setFinalDiscount}
          cashAmount={transaction.cashAmount}
          setCashAmount={transaction.setCashAmount}
          changeAmount={transaction.changeAmount}
          totalAmount={transaction.totalAmount}
        />
      </div>
      <div className="bg-gray-100 w-[calc(32rem)] h-[calc(100vh-2rem)] p-3">
        {/* BUTTONS BLOCK (default visible) */}
        {rightActiveSection === "buttons" && (
          <RestockActionButtons setRightActiveSection={setRightActiveSection} />
        )}

        {/* ADD / DISPOSE / RETURN ITEMS BLOCK */}
        {(rightActiveSection === "add" || rightActiveSection === "dispose" || rightActiveSection === "return") && (
          <RestockItemsBrowser
            rightActiveSection={rightActiveSection}
            setRightActiveSection={setRightActiveSection}
            search={derivedData.search}
            handleSearch={derivedData.handleSearch}
            handleSearchKeyDown={derivedData.handleSearchKeyDown}
            searchCategory={derivedData.searchCategory}
            setSearchCategory={derivedData.setSearchCategory}
            searchAvailability={derivedData.searchAvailability}
            setSearchAvailability={derivedData.setSearchAvailability}
            uniqueCategoryTypes={derivedData.uniqueCategoryTypes}
            isLoading={isLoading}
            searchLoading={derivedData.searchLoading}
            filteredAddItems={derivedData.filteredAddItems}
            filteredDisposeItems={derivedData.filteredDisposeItems}
            filteredRestockItems={derivedData.filteredRestockItems}
            buildDisposeDisplayItem={derivedData.buildDisposeDisplayItem}
            loadItemtoList={transaction.loadItemtoList}
          />
        )}
      </div>


      {/* Status Modal */}
        <StatusModal
          isOpen={transaction.modal.open}
          closeModal={transaction.closeModal}
          type={transaction.modal.type}
          description={transaction.modal.description}
          context="restock"
        />

    </div>
  );
}

export default InventoryRestock;
