import React, { useEffect, useContext, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Search, Users, Building2, Trash2, Plus, RefreshCw } from "lucide-react";
import { supplierApi } from '../../api/localApi';
import ToastContext from '../toasts/ToastService';
import { useReactiveData, TABLES } from '../../store';
import StatusModal from '../../components/StatusModal.jsx';

function SupplierReg() {
  const toast = useContext(ToastContext);
  //left section form block controls
  const [openSupplier, setOpenSupplier] = useState(true);

  // Use reactive data hook for suppliers
  const { data: supplierList, loading: isLoading, refetch: refetchSuppliers } = useReactiveData(
    TABLES.SUPPLIERS
  );


  //supplier searching and filtering operations
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");

  // Search handler
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 600);
  };

  //helper method for supplier availability filtering
  const interpretAvailability = (supplier) => {
    // handle boolean, string, numeric types defensively
    const a = supplier?.basic_info?.status;
    if (typeof a === "boolean") return a;
    if (typeof a === "string") return a.toLowerCase() === "true";
    return Boolean(a); // numbers (1/0) or other truthy/falsy
  };

  // Filter suppliers based on search, category and availability
  const filteredSuppliers = (supplierList || []).filter((supplier) => {
    // category match: either All or supplier.category.type equals selected
    const matchesCategory =
      searchCategory === "All" ||
      (supplier?.basic_info && supplier.basic_info.type === searchCategory);

    // availability match: All, Available (true), Unavailable (false)
    const isAvailable = interpretAvailability(supplier);
    const matchesAvailability =
      searchAvailability === "All" ||
      (searchAvailability === "Available" && isAvailable) ||
      (searchAvailability === "Unavailable" && !isAvailable);

    // text search match
    const matchesSearch =
      (supplier?.basic_info?.supplier_name || "").toLowerCase().includes((search || "").toLowerCase());

    return matchesCategory && matchesAvailability && matchesSearch;
  });

  // to switch between add and update api call via button switching
  const [isUserEditting, setUserEditing] = useState(false);
  const [formStatus, setFormStatus] = useState("form");   // possible values: "form" | "loading"
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });

  // keep the timer ID so we can clear it if the component unmounts early
  const timerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const closeStatusModal = () => {
    setStatusModal({ open: false, type: null, description: "" });
    setFormStatus("form");
  };

  // Load item object into form
  const loadSupplier = (supplier) => {
    console.log(supplier)
    //to enable edit button and disable the create button
    setUserEditing(true);
    setFormData(
      {
        id: supplier.id,
        supplier_name: supplier?.basic_info?.supplier_name,
        type: supplier?.basic_info?.type,
        supplier_address: supplier?.basic_info?.supplier_address,
        status: supplier?.basic_info?.status,
        contact: supplier?.basic_info?.contact,

        current_amount: supplier?.financial_info?.current_amount,
        previous_amount: supplier?.financial_info?.previous_amount,

        account_name: supplier?.account_info?.account_name,
        account_nickname: supplier?.account_info?.account_nickname,
        account_bank: supplier?.account_info?.account_bank,
        account_number: supplier?.account_info?.account_number,
        account_branch: supplier?.account_info?.account_branch
      }
    );
  };

  const [formData, setFormData] = useState(
    {
      id: 0,
      supplier_name: "",
      type: "",
      supplier_address: "",
      status: true,
      contact: "",

      current_amount: 0,
      previous_amount: 0,

      account_name: "",
      account_nickname: "",
      account_bank: "",
      account_number: "",
      account_branch: "",
    }
  );

  //clear the form and related statee data(hrrngh)
  const clearUserInput = () => {
    //alert("clearing user inputs")
    setFormData(
      {
        id: 0,
        supplier_name: "",
        type: "",
        supplier_address: "",
        status: false,
        contact: "",

        current_amount: 0,
        previous_amount: 0,

        account_name: "",
        account_nickname: "",
        account_bank: "",
        account_number: "",
        account_branch: "",
      }
    )
    //switch from update item button to add item button
    setUserEditing(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  //request data validation
  const isRequestDataValid = (requestData) => {
    const { basic_info, financial_info, account_info: payment_info } = requestData;

    // Check basic_info fields
    if (
      !basic_info.supplier_name?.trim() ||
      !basic_info.contact?.trim() ||
      !basic_info.type?.trim() ||
      !basic_info.supplier_address?.trim()
      //||
      //!basic_info.status?.trim()
    ) {
      console.log("basic info missing");
      return false;
    }

    // previous_amount and all payment/account fields are optional

    return true;
  };

  // Create new supplier
  const registerSupplier = async (e) => {
    setFormStatus("loading");
    e.preventDefault();
    try {
      const requestData = {
        basic_info: {
          supplier_name: formData.supplier_name,
          contact: formData.contact,
          type: formData.type,
          supplier_address: formData.supplier_address,
          status: formData.status
        },
        financial_info: {
          current_amount: formData.current_amount,
          previous_amount: formData.previous_amount
        },
        account_info: {
          account_number: formData.account_number,
          account_bank: formData.account_bank,
          account_branch: formData.account_branch,
          account_name: formData.account_name,
          account_nickname: formData.account_nickname
        }
      };

      if (!isRequestDataValid(requestData)) {
        //console.log('Validation failed: One or more fields are empty');
        //toast.open("Please enter all fields", "Missing fields");
        toast.open("Please enter all fields", 4000, 'Missing fields', 'error');
        setFormStatus("form");
        return; // Cancel API call
      }
      console.log(requestData);
      const response = await supplierApi.create(requestData);

      if (response.status === "success") {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'success', description: `Supplier "${formData.supplier_name}" created successfully` });
        clearUserInput();
      } else {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'failed', description: 'Failed to create supplier. Please try again.' });
      }
    } catch (err) {
      console.error("Create supplier error:", err);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Create supplier operation failed' });
      toast.open("Create Supplier operation failed", 4000, 'Supplier creation Failed', 'error');
    }
    finally {
      refetchSuppliers();
    }
  };


  // Update selected supplier
  const updateSupplier = async (e) => {
    setFormStatus("loading");
    e.preventDefault();
    try {
      const requestData = {
        basic_info: {
          supplier_name: formData.supplier_name,
          contact: formData.contact,
          type: formData.type,
          supplier_address: formData.supplier_address,
          status: formData.status
        },
        financial_info: {
          current_amount: formData.current_amount,
          previous_amount: formData.previous_amount
        },
        account_info: {
          account_number: formData.account_number,
          account_bank: formData.account_bank,
          account_branch: formData.account_branch,
          account_name: formData.account_name,
          account_nickname: formData.account_nickname
        }
      };
      if (!isRequestDataValid(requestData)) {
        //console.log('Validation failed: One or more fields are empty');
        //toast.open("Please enter all fields", "Missing fields");
        toast.open("Please enter all fields", 4000, 'Missing fields', 'error');
        setFormStatus("form");
        return; // Cancel API call
      }

      console.log("updating supplier: " + requestData);
      console.log(formData.id);
      const response = await supplierApi.update(formData.id, requestData);

      if (response.status === "success") {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'success', description: `Supplier "${formData.supplier_name}" updated successfully` });
        clearUserInput();
      } else {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'failed', description: 'Failed to update supplier. Please try again.' });
      }
    } catch (err) {
      console.error("Update supplier error:", err.message);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Update supplier operation failed' });
      toast.open("Update supplier operation failed", 4000, 'Supplier update Failed', 'error');
    }
    finally {
      refetchSuppliers();
    }
  };

  const deleteSupplier = async () => {
    setFormStatus("loading");
    try {
      const response = await supplierApi.delete(formData.id);

      if (response.status === "success") {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'success', description: 'Supplier deleted successfully' });
        clearUserInput();
      } else {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'failed', description: 'Failed to delete supplier. Please try again.' });
      }
    } catch (err) {
      console.error("Delete supplier error:", err);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Delete supplier operation failed' });
      toast.open("Delete supplier operation failed", 4000, 'Supplier deletion Failed', 'error');
    }
    finally {
      refetchSuppliers();
    }
  };

  return (
    <div className="flex bg-gray-50 w-full h-[calc(100vh-2rem)] relative">

      {formStatus === "form" ? (
        <div className="bg-gray-100 w-[28rem] h-[calc(100vh-2rem)] p-3 flex flex-col">
          {/* form section (left) */}
          <div className="flex flex-col flex-1 gap-3 overflow-y-auto">
            {/* ▼ supplier description block ▼ */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenSupplier(!openSupplier)}
                className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-[#1A318C]" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Supplier Details</span>
                </div>
                {openSupplier ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {openSupplier && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Supplier Name
                      </label>
                      <input
                        type="text"
                        name="supplier_name"
                        value={formData.supplier_name}
                        onChange={handleInputChange}
                        placeholder="Enter supplier name"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Supplier Type
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select type</option>
                        <option value="company">Company</option>
                        <option value="personal">Personal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Address
                      </label>
                      <textarea
                        name="supplier_address"
                        value={formData.supplier_address}
                        onChange={handleInputChange}
                        placeholder="Enter address..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                          Status
                        </label>
                        <select
                          name="status"
                          value={String(formData.status)}
                          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value === 'true' }))}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                        >
                          <option value="true">Available</option>
                          <option value="false">Unavailable</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                          Contact
                        </label>
                        <input
                          type="text"
                          name="contact"
                          value={formData.contact}
                          onChange={handleInputChange}
                          placeholder="Phone number"
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Previous Amount (Rs.)
                      </label>
                      <input
                        type="number"
                        name="previous_amount"
                        value={formData.previous_amount}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>

                    {/* Payment Info Section */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Information</p>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                              Bank
                            </label>
                            <input
                              type="text"
                              name="account_bank"
                              value={formData.account_bank}
                              onChange={handleInputChange}
                              placeholder="Bank name"
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                              Account No
                            </label>
                            <input
                              type="text"
                              name="account_number"
                              value={formData.account_number}
                              onChange={handleInputChange}
                              placeholder="Account number"
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                              Branch
                            </label>
                            <input
                              type="text"
                              name="account_branch"
                              value={formData.account_branch}
                              onChange={handleInputChange}
                              placeholder="Branch name"
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                              Acc. Nickname
                            </label>
                            <input
                              type="text"
                              name="account_nickname"
                              value={formData.account_nickname}
                              onChange={handleInputChange}
                              placeholder="Nickname"
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                            Account Name
                          </label>
                          <input
                            type="text"
                            name="account_name"
                            value={formData.account_name}
                            onChange={handleInputChange}
                            placeholder="Account holder name"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom button set */}
          <div className="flex flex-row w-full gap-2 pt-3">
            <button
              onClick={() => {
                clearUserInput();
                deleteSupplier();
                setUserEditing(false)
              }}
              className="flex items-center justify-center flex-1 min-w-0 h-11 px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 text-sm font-medium shadow-md shadow-red-200"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span className="truncate">Delete</span>
            </button>
            <button
              onClick={() => {
                clearUserInput();
                setUserEditing(false)
              }}
              className="flex-1 min-w-0 h-11 px-3 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm font-medium"
            >
              <span className="truncate">Cancel</span>
            </button>
            <button
              onClick={isUserEditting ? updateSupplier : registerSupplier}
              className="flex items-center justify-center flex-[1.5] min-w-0 h-11 px-4 py-2 bg-[#1A318C] text-white rounded-xl hover:bg-[#152870] transition-all duration-200 text-sm font-semibold shadow-md shadow-blue-900/20"
            >
              {isUserEditting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  <span>Update</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 w-[28rem] h-[calc(100vh-2rem)] p-3 flex flex-col items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="animate-spin mb-4 rounded-full border-4 border-gray-200 border-t-[#1A318C] h-14 w-14"></div>
            <h2 className="text-lg font-semibold text-gray-800">Processing...</h2>
            <p className="text-sm text-gray-500 mt-1">Please wait</p>
          </div>
        </div>
      )}


      {/* table section (right) */}
      <div className="flex-1 h-[calc(100vh-2rem)] flex flex-col">
        {/* search bar with dropdowns */}
        <nav className="bg-white border-b border-gray-100 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search suppliers by name..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="All">All Types</option>
                <option value="company">Company</option>
                <option value="personal">Personal</option>
              </select>
              <button className="h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
            {/* Results count */}
            <div className="mt-3 flex items-center gap-3">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{filteredSuppliers.length}</span> suppliers
              </p>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1A318C]/10 rounded-lg text-xs font-semibold text-[#1A318C]">
                <Users className="w-3.5 h-3.5" />
                {(supplierList || []).length} Total
              </span>
            </div>
          </div>
        </nav>

        {/* Modern table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-slate-300 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Supplier Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Contact</div>
                <div className="col-span-1"></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
                  <p className="text-gray-500">Loading suppliers...</p>
                </div>
              ) : searchLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
                  <span className="text-gray-500">Searching...</span>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Users className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">No suppliers found</h3>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredSuppliers.map((supplier, index) => (
                  <div
                    key={supplier.id}
                    onClick={() => loadSupplier(supplier)}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                      formData.id === supplier.id ? "bg-[#1A318C]/5 border-l-4 border-l-[#1A318C]" : ""
                    }`}
                  >
                    <div className="col-span-1 text-sm text-gray-400 font-medium">{index + 1}</div>
                    <div className="col-span-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A318C] to-[#152870] flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {supplier.basic_info.supplier_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-800">{supplier.basic_info.supplier_name}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                        supplier.basic_info.type === 'company'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}>
                        {supplier.basic_info.type === 'company' ? (
                          <Building2 className="w-3 h-3 mr-1" />
                        ) : (
                          <Users className="w-3 h-3 mr-1" />
                        )}
                        {supplier.basic_info.type || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        supplier.basic_info.status
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${supplier.basic_info.status ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {supplier.basic_info.status ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600 font-mono">{supplier.basic_info.contact}</div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-gray-400 transition-all"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <StatusModal
        isOpen={statusModal.open}
        closeModal={closeStatusModal}
        type={statusModal.type}
        description={statusModal.description}
        context="supplier"
      />
    </div>
  )
}

export default SupplierReg