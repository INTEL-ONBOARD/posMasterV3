import React, { useEffect, useContext, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from "lucide-react";
import { supplierApi } from '../../api/localApi';
import ToastContext from '../toasts/ToastService';

function SupplierReg() {
  const toast = useContext(ToastContext);
  //left section form block controls
  const [openSupplier, setOpenSupplier] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [supplierList, setSupplierList] = useState([
    {
      basic_info: {
        supplier_name: "Acme Supplies Ltd",
        contact: "+94 77 123 4567",
        type: "company",
        supplier_address: "123 Main Street, Colombo, Sri Lanka",
        status: true
      },
      financial_info: {
        current_amount: 50000,
        previous_amount: 30000
      },
      payment_info: {
        account_number: "1234567890",
        account_related_bank: "Commercial Bank",
        account_related_branch: "Colombo 07",
        account_name: "Acme Supplies Ltd",
        account_nickName: "AcmeBank"
      },
      _id: "68afcbf3cf033138151d2740",
      id: 2,
      supplier_update_datetime: "2001-01-01T03:24:35.000Z",
      supplier_created_datetime: "2001-01-01T03:24:35.000Z",
      __v: 0
    }
  ]);
  const fetchSupplierList = async () => {
    try {
      const response = await supplierApi.getAll();
      if (response.status === "success") {
        setSupplierList(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Fetch supplier from API
  useEffect(() => {
    // if (!loadingUoms) {
    fetchSupplierList();
    // }
    //}, [loadingUoms]);
  }, []);


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
  const filteredSuppliers = supplierList.filter((supplier) => {
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
  const [formStatus, setFormStatus] = useState("form");   // possible values: "form" | "loading" | "success" | "fail"
  // keep the timer ID so we can clear it if the component unmounts early
  const timerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

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

        account_name: supplier?.payment_info?.account_name,
        account_nickName: supplier?.payment_info?.account_nickName,
        account_related_bank: supplier?.payment_info?.account_related_bank,
        account_number: supplier?.payment_info?.account_number,
        account_related_branch: supplier?.payment_info?.account_related_branch
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
      account_nickName: "",
      account_related_bank: "",
      account_number: "",
      account_related_branch: "",
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
        account_nickName: "",
        account_related_bank: "",
        account_number: "",
        account_related_branch: "",
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
    const { basic_info, financial_info, payment_info } = requestData;

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

    // Check financial_info fields
    if (
      //!basic_info.current_amount?.toString().trim() ||
      !financial_info.previous_amount?.toString().trim()
    ) {
      console.log(basic_info.previous_amount);
      console.log("financial info missing");
      return false;
    }

    //Check payment_info fields
    if (
      !payment_info.account_number?.trim() ||
      !payment_info.account_related_bank?.trim() ||
      !payment_info.account_related_branch?.trim() ||
      !payment_info.account_name?.trim() ||
      !payment_info.account_nickName?.trim()
    ) {
      return false;
    }

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
        payment_info: {
          account_number: formData.account_number,
          account_related_bank: formData.account_related_bank,
          account_related_branch: formData.account_related_branch,
          account_name: formData.supplier_name,
          account_nickName: formData.account_nickName
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
        // Add new item to local state
        //alert("Item created successfully!");
        //toast.open("Item created successfully", 4000, 'Success', 'success');
        //clear data upon successful response
        setFormStatus("success");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
        clearUserInput();
      } else {
        //alert(response.data.message || "Failed to create item");
        //toast.open("Create item request failed, please try again", 4000, 'Request Failed', 'error');
        setFormStatus("fail");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
      }
    } catch (err) {
      console.error("Create supplier error:", err);
      //alert("Error creating item"+err.message);
      setFormStatus("fail");
      // after 4 seconds, flip back to the form
      timerRef.current = window.setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 4000);
      toast.open("Create Supplier operation failed", 4000, 'Item creation Failed', 'error');
      console.log(err.message);
    }
    finally {
      //repopulate items
      fetchSupplierList();
      isLoading(false);
      setFormStatus("form");
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
        payment_info: {
          account_number: formData.account_number,
          account_related_bank: formData.account_related_bank,
          account_related_branch: formData.account_related_branch,
          account_name: formData.account_name,
          account_nickName: formData.account_nickName
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
        // Add new item to local state
        //alert("Item created successfully!");
        //toast.open("Item created successfully", 4000, 'Success', 'success');
        //clear data upon successful response
        setFormStatus("success");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
        clearUserInput();
      } else {
        //alert(response.data.message || "Failed to create item");
        //toast.open("Create item request failed, please try again", 4000, 'Request Failed', 'error');
        setFormStatus("fail");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
      }
    } catch (err) {
      console.error("Update supplier error:", err.message);
      console.error("Update supplier error:", err);
      //alert("Error creating item"+err.message);
      setFormStatus("fail");
      // after 4 seconds, flip back to the form
      timerRef.current = window.setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 4000);
      toast.open("Update supplier operation failed", 4000, 'Item creation Failed', 'error');
    }
    finally {
      //repopulate items
      fetchSupplierList();
    }
  };

  const deleteSupplier = async () => {
    setFormStatus("loading");
    try {

      const response = await supplierApi.delete(formData.id);

      if (response.status === "success") {
        // Add new item to local state
        //alert("Item created successfully!");
        //toast.open("Item created successfully", 4000, 'Success', 'success');
        //clear data upon successful response
        setFormStatus("success");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
        clearUserInput();
      } else {
        //alert(response.data.message || "Failed to create item");
        //toast.open("Create item request failed, please try again", 4000, 'Request Failed', 'error');
        setFormStatus("fail");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
      }
    } catch (err) {
      console.error("Delete supplier error:", err);
      //alert("Error creating item"+err.message);
      setFormStatus("fail");
      // after 4 seconds, flip back to the form
      timerRef.current = window.setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 4000);
      toast.open("Delete supplier operation failed", 4000, 'Item creation Failed', 'error');
    }
    finally {
      //repopulate items
      fetchSupplierList();
    }
  };

  return (
    <div className="flex bg-gray-300 w-full h-[calc(100vh-2rem)] relative">

      {formStatus === "form" ? (
        <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2">
          {/* form section (left) */}
          {/* overflow-y-scroll */}
          <div className="flex flex-col h-[56rem] gap-3">
            {/* top block set */}
            <div>
              {/* ▼ supplier description block ▼ */}
              <div className="bg-white">
                <button
                  onClick={() => setOpenSupplier(!openSupplier)}
                  className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
                >
                  <span className="text-gray-400">SUPPLIER DESCRIPTION</span>
                  {openSupplier ? <ChevronUp /> : <ChevronDown />}
                </button>
                {openSupplier && (
                  <div className="px-4 bg-white pb-5">
                    {/* detailed description block */}
                    <div className="">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Supplier
                        </label>
                        <input
                          type="text"
                          name="supplier_name"
                          value={formData.supplier_name}
                          onChange={handleInputChange}
                          placeholder="Enter supplier name"
                          className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Supplier Type
                        </label>
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- select supplier --</option>
                          <option value="company">Company</option>
                          <option value="personal">Personal</option>
                          {/* <option value="personal">cooperative</option>
                        <option value="other">other</option> */}
                        </select>
                      </div>
                      <div className='mt-1'>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Address
                        </label>
                        <textarea
                          name="supplier_address"
                          value={formData.supplier_address}
                          onChange={handleInputChange}
                          placeholder="Enter details..."
                          rows={3}
                          className="w-full mt-2 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Status
                          </label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {/* <option value={true}>-- select status --</option> */}
                            <option value={true}>Available</option>
                            <option value={false}>Unavailable</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Contact
                          </label>
                          <input
                            type="text"
                            name="contact"
                            value={formData.contact}
                            onChange={handleInputChange}
                            placeholder=""
                            className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="mt-1 grid grid-cols-2 gap-4">
                        {/* <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Current Amount (Rs.)
                      </label>
                      <input
                        type="number"
                        name="current_amount"
                        value={formData.current_amount}
                        onChange={handleInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div> */}

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Previous Amount (Rs.)
                          </label>
                          <input
                            type="number"
                            name="previous_amount"
                            value={formData.previous_amount}
                            onChange={handleInputChange}
                            placeholder=""
                            className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Payment Bank
                          </label>
                          <input
                            type="text"
                            name="account_related_bank"
                            value={formData.account_related_bank}
                            onChange={handleInputChange}
                            placeholder=""
                            className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Bank Account No
                          </label>
                          <input
                            type="text"
                            name="account_number"
                            value={formData.account_number}
                            onChange={handleInputChange}
                            placeholder=""
                            className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Payment Branch
                          </label>
                          <input
                            type="text"
                            name="account_related_branch"
                            value={formData.account_related_branch}
                            onChange={handleInputChange}
                            placeholder=""
                            className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Acc Nick Name
                          </label>
                          <input
                            type="text"
                            name="account_nickName"
                            value={formData.account_nickName}
                            onChange={handleInputChange}
                            placeholder=""
                            className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom button set */}
          <div className="flex flex-row w-full gap-2">
            <button
              onClick={() => {
                clearUserInput();
                //switch from update supplier button to add supplier button
                deleteSupplier();
                setUserEditing(false)
              }}
              className="flex-1 min-w-0 h-10 px-3 py-2 border bg-[#D01710] border-gray-300 text-white hover:bg-red-700 transition-colors text-sm"
            >
              <span className="truncate">Delete</span>
            </button>
            <button
              onClick={() => {
                clearUserInput();
                //switch from update supplier button to add supplier button
                //deleteSupplier();
                setUserEditing(false)
              }}
              className="flex-1 min-w-0 h-10 px-3 py-2 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors text-sm"
            >
              <span className="truncate">Cancel</span>
            </button>
            {/* switch between update and add button functions based on item card selection and clear form button click */}
            <button
              onClick={isUserEditting ? updateSupplier : registerSupplier}
              className="flex-1 min-w-0 h-10 px-3 py-2 bg-blue-600 text-white hover:bg-[#1A318C] transition-colors text-sm"
            >
              <span className="truncate">{isUserEditting ? 'Update Supplier' : 'Add Supplier'}</span>
            </button>

          </div>
        </div>
      ) : formStatus === "loading" ? (
        // <div className="w-1/3 h-[calc(100vh-7rem)] p-5 z-10 flex flex-col justify-around">
        // <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] overflow-y-scroll">
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 z-10 flex flex-col justify-around">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin mb-3 rounded-full border-4 border-gray-300 border-t-[#1A318C] h-12 w-12"></div>
            <h2>Please wait…</h2>
          </div>
        </div>
      ) : formStatus === "success" ? (
        // <div className="w-1/3 h-[calc(100vh-7rem)] p-5 z-10 flex flex-col justify-around">
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 z-10 flex flex-col justify-around">
          <div className="flex flex-col items-center justify-center">
            <svg width={80} height={80} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* green circle */}
              <circle cx="12" cy="12" r="10" fill="#22C55E" />
              {/* white check */}
              <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <h2 className="font-semibold text-xl">Success!</h2>
          </div>
        </div>
      ) : (
        /* if it's none of the above, we treat it as "fail" */
        // <div className="w-1/3 h-[calc(100vh-7rem)] p-5 z-10 flex flex-col justify-around">
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 z-10 flex flex-col justify-around">
          <div className="flex flex-col items-center justify-center">
            <svg width={80} height={80} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* red circle */}
              <circle cx="12" cy="12" r="10" fill="#EF4444" />
              {/* white “X” */}
              <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h2 className="font-semibold text-xl">Failed...</h2>
          </div>
        </div>
      )}


      {/* table section (right) */}
      <div className="bg-white w-[calc(77rem)] h-[calc(100vh-2rem)]">
        {/* search bar with dropdowns */}
        <nav className="w-full flex justify-between py-4 px-10 bg-white gap-6 mb-4 ">
          <div className="flex-1 flex border-b border-[#EDEDED] h-12 items-center">
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search supplier name here"
              className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
            />
            <button
              // onClick={handleSearch}
              className="flex items-center px-4 py-2 bg-[#1A318C] text-white"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
              </svg>
              Search
            </button>
          </div>


          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="w-80 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
          >
            <option value="All">All Supplier Types</option>
            <option value="company">Company</option>
            <option value="personal">Personal</option>
          </select>
          <select
            // value={viewMode}
            // onChange={(e) => setViewMode(e.target.value)}
            disabled={true}
            className="w-80 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
          >
            <option value="grid">Sort by</option>
            <option value="grid">Name</option>
            <option value="list">Current Amount</option>
          </select>
        </nav>
        {/* table */}
        <div className="overflow-x-auto h-[28rem] p-2 lg:p-4">
          <table className="w-full min-w-[500px] table-auto">
            <thead className="bg-gray-700 text-[#848484]">
              <tr>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">#</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">Name</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">Status</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">Contact</th>
                {/* <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">Due Amount</th> */}
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm"></th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {isLoading ? (
                // single row that spans all columns and centers the spinner vertically/horizontally
                <tr>
                  <td colSpan={7}>
                    <div className="h-[22rem] w-full flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12"></div>
                        <span className="mt-3 text-gray-700 text-lg">Loading table...</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : searchLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="h-[22rem] w-full flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12 mb-3"></div>
                      <span className="text-gray-700 text-xl mt-1">Please wait...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="h-[18rem] w-full flex items-center justify-center">
                      <span className="text-gray-500 text-lg">No suppliers found!</span>
                    </div>
                  </td>
                </tr>
              ) : (
                // actual data rows
                filteredSuppliers.map((supplier, index) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => loadSupplier(supplier)}
                  >
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">{index + 1}</td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                      {supplier.basic_info.supplier_name}
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                      {supplier.basic_info.status ? "Available" : "Unavailable"}
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                      {supplier.basic_info.contact}
                    </td>
                    {/* <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
              {(supplier.financial_info.previous_amount - supplier.financial_info.current_amount).toFixed(2)}
            </td> */}
                    <td className="px-2 lg:px-4 py-2 lg:py-3">
                      <button
                        type="button"
                        aria-label="Close notification"
                        className="m-3 w-5 h-5 rounded-full bg-black inline-flex items-center justify-center focus:outline-none"
                      >
                        <svg
                          className="w-4 h-4 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>



      </div>
    </div>
  )
}

export default SupplierReg