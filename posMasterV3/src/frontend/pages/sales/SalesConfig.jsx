import { useState, useEffect } from 'react';
import { ChevronRight, Settings, CreditCard, Receipt, Printer, Bell, Save, RotateCcw, Check, Wallet, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Heart, Users, X } from 'lucide-react';
import { paymentMethodApi } from '../../api/localApi';

function SalesConfig({ isActive }) {
  const [selectedSection, setSelectedSection] = useState('payment-methods');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodForm, setMethodForm] = useState({
    name: '',
    description: '',
    type: 'cash',
    credit_months: 0,
    interest_rate: 0,
    is_active: true,
    is_member_only: false,
    icon: 'Wallet',
    color: 'gray'
  });

  // Fetch payment methods on mount
  useEffect(() => {
    if (isActive) {
      fetchPaymentMethods();
    }
  }, [isActive]);

  const fetchPaymentMethods = async () => {
    setIsLoadingMethods(true);
    try {
      const response = await paymentMethodApi.getAll();
      if (response.status === 'success') {
        setPaymentMethods(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const openAddMethodModal = () => {
    setEditingMethod(null);
    setMethodForm({
      name: '',
      description: '',
      type: 'cash',
      credit_months: 0,
      interest_rate: 0,
      is_active: true,
      is_member_only: false,
      icon: 'Wallet',
      color: 'emerald'
    });
    setShowMethodModal(true);
  };

  const openEditMethodModal = (method) => {
    setEditingMethod(method);
    setMethodForm({
      name: method.name,
      description: method.description || '',
      type: method.type,
      credit_months: method.credit_months || 0,
      interest_rate: method.interest_rate || 0,
      is_active: method.is_active,
      is_member_only: method.is_member_only,
      icon: method.icon || 'Wallet',
      color: method.color || 'gray'
    });
    setShowMethodModal(true);
  };

  const handleSaveMethod = async () => {
    setIsSaving(true);
    try {
      if (editingMethod) {
        await paymentMethodApi.update(editingMethod.id, methodForm);
      } else {
        await paymentMethodApi.create(methodForm);
      }
      await fetchPaymentMethods();
      setShowMethodModal(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save payment method:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMethodActive = async (method) => {
    try {
      await paymentMethodApi.toggleActive(method.id);
      await fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to toggle payment method:', error);
    }
  };

  const handleDeleteMethod = async (method) => {
    if (!confirm(`Are you sure you want to delete "${method.name}"?`)) return;
    try {
      await paymentMethodApi.delete(method.id);
      await fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    }
  };

  const getMethodIcon = (iconName) => {
    const icons = { Wallet, CreditCard, Heart, Users };
    return icons[iconName] || Wallet;
  };

  const colorClasses = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200' }
  };

  const [config, setConfig] = useState({
    defaultPaymentMethodId: null, // Store the ID of the selected payment method
    enableCreditPayment: true,
    enableIncomePayment: true,
    requireCashierAuth: false,
    showItemizedReceipt: true,
    includeStoreLogo: true,
    includeStoreAddress: true,
    includeDateTime: true,
    showBarcode: true,
    receiptFooterText: 'Thank you for shopping with us!',
    autoPrint: true,
    printerName: 'Default Printer',
    paperSize: '80mm',
    copies: 1,
    lowStockAlert: true,
    lowStockThreshold: 10,
    salesNotification: true,
    soundEnabled: true
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Get the selected default payment method details
  const selectedDefaultMethod = paymentMethods.find(m => m.id === config.defaultPaymentMethodId);

  const handleReset = () => {
    setConfig({
      defaultPaymentMethodId: null,
      enableCreditPayment: true,
      enableIncomePayment: true,
      requireCashierAuth: false,
      showItemizedReceipt: true,
      includeStoreLogo: true,
      includeStoreAddress: true,
      includeDateTime: true,
      showBarcode: true,
      receiptFooterText: 'Thank you for shopping with us!',
      autoPrint: true,
      printerName: 'Default Printer',
      paperSize: '80mm',
      copies: 1,
      lowStockAlert: true,
      lowStockThreshold: 10,
      salesNotification: true,
      soundEnabled: true
    });
  };

  const ToggleSwitch = ({ enabled, onChange }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[#1A318C]' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  const sections = [
    { id: 'payment-methods', label: 'Payment Methods', description: 'Manage payment options', icon: Wallet, iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
    { id: 'payment', label: 'Payment Settings', description: 'Configure payment options', icon: CreditCard, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { id: 'receipt', label: 'Receipt Settings', description: 'Customize receipt appearance', icon: Receipt, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { id: 'printer', label: 'Printer Settings', description: 'Manage printing preferences', icon: Printer, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { id: 'notifications', label: 'Notifications', description: 'Set up alerts and sounds', icon: Bell, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' }
  ];

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-gray-50">
      {/* Left Panel with Navigation */}
      <div className="w-80 bg-gray-100 h-full p-3">
        <div className="flex flex-col h-full gap-3">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[#1A318C]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Sales Configuration</h2>
                <p className="text-xs text-gray-500">Manage sales settings</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-3 space-y-2">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const isSelected = selectedSection === section.id;
                return (
                  <button
                    key={`${section.id || section.title || "section"}-${index}`}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                      isSelected
                        ? "bg-[#1A318C] shadow-lg shadow-blue-900/20"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-white/20" : section.iconBg
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? "text-white" : section.iconColor}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-gray-800"}`}>
                            {section.label}
                          </p>
                          <p className={`text-xs ${isSelected ? "text-white/70" : "text-gray-500"}`}>
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${isSelected ? "text-white" : "text-gray-400"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
            <button
              onClick={handleReset}
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
        </div>
      </div>

      {/* Right Panel - Content Area */}
      <div className="flex-1 h-full overflow-hidden bg-gray-50">
        {/* Payment Methods Management */}
        <div className={selectedSection === 'payment-methods' ? "h-full overflow-auto" : "hidden"}>
          {/* Header Bar */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Payment Methods</h3>
                <p className="text-sm text-gray-500 mt-0.5">Manage available payment options for sales</p>
              </div>
              <button
                onClick={openAddMethodModal}
                className="h-11 px-5 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 flex items-center gap-2 shadow-md shadow-blue-900/20"
              >
                <Plus className="w-5 h-5" />
                Add Method
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {/* Payment Methods Grid */}
            {isLoadingMethods ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-[#1A318C] rounded-full animate-spin"></div>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
                  <Wallet className="w-10 h-10 text-gray-400" />
                </div>
                <h4 className="text-xl font-semibold text-gray-800">No Payment Methods</h4>
                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">Add your first payment method to get started. You can configure cash, credit, and special payment options.</p>
                <button
                  onClick={openAddMethodModal}
                  className="mt-6 h-12 px-8 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all shadow-lg shadow-blue-900/20"
                >
                  Add Payment Method
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {paymentMethods.map((method, index) => {
                  const IconComponent = getMethodIcon(method.icon);
                  const colors = colorClasses[method.color] || colorClasses.gray;
                return (
                  <div
                      key={`${method.id || method.name || "method"}-${index}`}
                      className={`bg-white rounded-xl border shadow-sm p-5 transition-all hover:shadow-lg hover:scale-[1.01] ${
                        method.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                            <IconComponent className={`w-7 h-7 ${colors.text}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-bold text-gray-800">{method.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{method.description || 'No description'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                                {method.type === 'cash' ? 'Cash' : method.type === 'credit' ? `Credit ${method.credit_months}M` : 'Special'}
                              </span>
                              {method.is_member_only && (
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-600">
                                  Members Only
                                </span>
                              )}
                              {!method.is_active && (
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleToggleMethodActive(method)}
                          className={`flex-1 h-9 rounded-lg flex items-center justify-center gap-2 transition-colors text-xs font-semibold ${
                            method.is_active
                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {method.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {method.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => openEditMethodModal(method)}
                          className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMethod(method)}
                          className="h-9 w-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info Box - Only show when there are methods */}
            {paymentMethods.length > 0 && (
              <div className="bg-teal-50 rounded-xl p-5 border border-teal-200 mt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-teal-800">Payment Method Tips</p>
                    <ul className="text-sm text-teal-600 mt-2 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0"></span>
                        Mark methods as "Members Only" for credit and special payment options
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0"></span>
                        Inactive methods will not appear during checkout
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0"></span>
                        Credit months determine the payment installment period
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Settings */}
        <div className={selectedSection === 'payment' ? "h-full overflow-auto" : "hidden"}>
          {/* Header Bar */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Payment Settings</h3>
                <p className="text-sm text-gray-500 mt-0.5">Configure default payment options and behavior</p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Default Settings Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Default Payment Method</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Select Default Method
                    </label>
                    {paymentMethods.filter(m => m.is_active).length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm text-amber-700 font-medium">No payment methods configured</p>
                        <p className="text-xs text-amber-600 mt-1">Add payment methods in the "Payment Methods" section first</p>
                      </div>
                    ) : (
                      <select
                        value={config.defaultPaymentMethodId || ''}
                        onChange={(e) => setConfig({ ...config, defaultPaymentMethodId: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">-- Select a payment method --</option>
                        {paymentMethods.filter(m => m.is_active).map((method, index) => (
                          <option key={`${method.id || method.name || "method"}-${index}`} value={method.id}>
                            {method.name} ({method.type === 'credit' ? `Credit ${method.credit_months}M` : method.type === 'cash' ? 'Cash' : 'Special'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Show selected method details */}
                  {selectedDefaultMethod && (
                    <div className={`p-4 rounded-xl border ${
                      selectedDefaultMethod.type === 'cash' ? 'bg-emerald-50 border-emerald-200' :
                      selectedDefaultMethod.type === 'credit' ? 'bg-blue-50 border-blue-200' :
                      'bg-purple-50 border-purple-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedDefaultMethod.type === 'cash' ? 'bg-emerald-100' :
                          selectedDefaultMethod.type === 'credit' ? 'bg-blue-100' :
                          'bg-purple-100'
                        }`}>
                          {(() => {
                            const IconComponent = getMethodIcon(selectedDefaultMethod.icon);
                            return <IconComponent className={`w-5 h-5 ${
                              selectedDefaultMethod.type === 'cash' ? 'text-emerald-600' :
                              selectedDefaultMethod.type === 'credit' ? 'text-blue-600' :
                              'text-purple-600'
                            }`} />;
                          })()}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${
                            selectedDefaultMethod.type === 'cash' ? 'text-emerald-800' :
                            selectedDefaultMethod.type === 'credit' ? 'text-blue-800' :
                            'text-purple-800'
                          }`}>{selectedDefaultMethod.name}</p>
                          <p className={`text-xs ${
                            selectedDefaultMethod.type === 'cash' ? 'text-emerald-600' :
                            selectedDefaultMethod.type === 'credit' ? 'text-blue-600' :
                            'text-purple-600'
                          }`}>
                            {selectedDefaultMethod.type === 'cash' && 'Immediate payment - no credit period'}
                            {selectedDefaultMethod.type === 'credit' && `${selectedDefaultMethod.credit_months} month credit period`}
                            {selectedDefaultMethod.type === 'special' && 'Special payment arrangement'}
                            {selectedDefaultMethod.is_member_only && ' • Members only'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Options Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Payment Options</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Enable Credit Payment</p>
                      <p className="text-xs text-gray-400 mt-0.5">Allow customers to pay with credit</p>
                    </div>
                    <ToggleSwitch enabled={config.enableCreditPayment} onChange={(v) => setConfig({ ...config, enableCreditPayment: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Enable Income Payment</p>
                      <p className="text-xs text-gray-400 mt-0.5">Allow members to use their income balance</p>
                    </div>
                    <ToggleSwitch enabled={config.enableIncomePayment} onChange={(v) => setConfig({ ...config, enableIncomePayment: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Require Cashier Authorization</p>
                      <p className="text-xs text-gray-400 mt-0.5">Require auth for high-value transactions</p>
                    </div>
                    <ToggleSwitch enabled={config.requireCashierAuth} onChange={(v) => setConfig({ ...config, requireCashierAuth: v })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200 mt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">Payment Settings Tips</p>
                  <ul className="text-sm text-emerald-600 mt-2 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                      The default payment method will be pre-selected during checkout
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                      Configure payment methods in the "Payment Methods" section
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                      Credit periods are defined per payment method, not globally
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className={selectedSection === 'receipt' ? "h-full overflow-auto" : "hidden"}>
          {/* Header Bar */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Receipt Settings</h3>
                <p className="text-sm text-gray-500 mt-0.5">Customize how receipts are displayed and printed</p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Receipt Content Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 xl:col-span-2">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Receipt Content</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Show Itemized Receipt</p>
                      <p className="text-xs text-gray-400 mt-0.5">Display individual items</p>
                    </div>
                    <ToggleSwitch enabled={config.showItemizedReceipt} onChange={(v) => setConfig({ ...config, showItemizedReceipt: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Include Store Logo</p>
                      <p className="text-xs text-gray-400 mt-0.5">Print store logo</p>
                    </div>
                    <ToggleSwitch enabled={config.includeStoreLogo} onChange={(v) => setConfig({ ...config, includeStoreLogo: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Include Store Address</p>
                      <p className="text-xs text-gray-400 mt-0.5">Show store address</p>
                    </div>
                    <ToggleSwitch enabled={config.includeStoreAddress} onChange={(v) => setConfig({ ...config, includeStoreAddress: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Include Date & Time</p>
                      <p className="text-xs text-gray-400 mt-0.5">Display timestamp</p>
                    </div>
                    <ToggleSwitch enabled={config.includeDateTime} onChange={(v) => setConfig({ ...config, includeDateTime: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl md:col-span-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Show Barcode</p>
                      <p className="text-xs text-gray-400 mt-0.5">Print barcode on receipt for scanning</p>
                    </div>
                    <ToggleSwitch enabled={config.showBarcode} onChange={(v) => setConfig({ ...config, showBarcode: v })} />
                  </div>
                </div>
              </div>

              {/* Footer Text Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Footer Text</h3>
                </div>
                <textarea
                  value={config.receiptFooterText}
                  onChange={(e) => setConfig({ ...config, receiptFooterText: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] text-sm resize-none"
                  placeholder="Enter footer message..."
                />
                <p className="text-xs text-gray-400 mt-2">This message appears at the bottom of every receipt</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 mt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">Receipt Customization Tips</p>
                  <ul className="text-sm text-amber-600 mt-2 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                      Include store logo and address for professional-looking receipts
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                      Barcodes make it easy to scan receipts for returns or lookups
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Printer Settings */}
        <div className={selectedSection === 'printer' ? "h-full overflow-auto" : "hidden"}>
          {/* Header Bar */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Printer Settings</h3>
                <p className="text-sm text-gray-500 mt-0.5">Configure printer hardware and print preferences</p>
              </div>
              <button className="h-11 px-5 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 flex items-center gap-2 shadow-md shadow-blue-900/20">
                <Printer className="w-5 h-5" />
                Print Test Page
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Printer Selection Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Printer className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Printer Selection</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Printer Name</label>
                    <select value={config.printerName} onChange={(e) => setConfig({ ...config, printerName: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer">
                      <option value="Default Printer">Default Printer</option>
                      <option value="Receipt Printer 1">Receipt Printer 1</option>
                      <option value="Receipt Printer 2">Receipt Printer 2</option>
                    </select>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-semibold text-purple-700">Connected</span>
                    </div>
                    <p className="text-xs text-purple-500 mt-1">Printer is ready to print</p>
                  </div>
                </div>
              </div>

              {/* Paper Configuration Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Paper Configuration</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Paper Size</label>
                    <select value={config.paperSize} onChange={(e) => setConfig({ ...config, paperSize: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer">
                      <option value="58mm">58mm (Small)</option>
                      <option value="80mm">80mm (Standard)</option>
                      <option value="A4">A4 (Full Page)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Number of Copies</label>
                    <input type="number" min="1" max="5" value={config.copies} onChange={(e) => setConfig({ ...config, copies: parseInt(e.target.value) || 1 })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all" />
                  </div>
                </div>
              </div>

              {/* Print Options Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Print Options</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Auto Print Receipt</p>
                      <p className="text-xs text-gray-400 mt-0.5">Print after each sale</p>
                    </div>
                    <ToggleSwitch enabled={config.autoPrint} onChange={(v) => setConfig({ ...config, autoPrint: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Print Preview</p>
                      <p className="text-xs text-gray-400 mt-0.5">Show preview before printing</p>
                    </div>
                    <ToggleSwitch enabled={false} onChange={() => {}} />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-purple-50 rounded-xl p-5 border border-purple-200 mt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-purple-800">Printer Setup Tips</p>
                  <ul className="text-sm text-purple-600 mt-2 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
                      80mm paper size is recommended for standard receipt printers
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
                      Use the test page button to verify printer connectivity
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className={selectedSection === 'notifications' ? "h-full overflow-auto" : "hidden"}>
          {/* Header Bar */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Notifications</h3>
                <p className="text-sm text-gray-500 mt-0.5">Configure alerts, notifications, and sound preferences</p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Stock Alerts Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Stock Alerts</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Low Stock Alert</p>
                      <p className="text-xs text-gray-400 mt-0.5">Notify when items are running low</p>
                    </div>
                    <ToggleSwitch enabled={config.lowStockAlert} onChange={(v) => setConfig({ ...config, lowStockAlert: v })} />
                  </div>
                  {config.lowStockAlert && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <label className="block text-xs font-medium text-red-700 uppercase tracking-wide mb-2">Low Stock Threshold</label>
                      <div className="flex items-center gap-3">
                        <input type="number" min="1" value={config.lowStockThreshold} onChange={(e) => setConfig({ ...config, lowStockThreshold: parseInt(e.target.value) || 10 })} className="w-24 px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all" />
                        <span className="text-xs text-red-600">items remaining</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sales Notifications Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Sales Notifications</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Sale Completed</p>
                      <p className="text-xs text-gray-400 mt-0.5">Show notification after each sale</p>
                    </div>
                    <ToggleSwitch enabled={config.salesNotification} onChange={(v) => setConfig({ ...config, salesNotification: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">High Value Sale</p>
                      <p className="text-xs text-gray-400 mt-0.5">Alert for large transactions</p>
                    </div>
                    <ToggleSwitch enabled={false} onChange={() => {}} />
                  </div>
                </div>
              </div>

              {/* Sound Settings Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">Sound Settings</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Sound Effects</p>
                      <p className="text-xs text-gray-400 mt-0.5">Play sounds for notifications</p>
                    </div>
                    <ToggleSwitch enabled={config.soundEnabled} onChange={(v) => setConfig({ ...config, soundEnabled: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Barcode Beep</p>
                      <p className="text-xs text-gray-400 mt-0.5">Sound when scanning items</p>
                    </div>
                    <ToggleSwitch enabled={true} onChange={() => {}} />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 mt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-800">Notification Tips</p>
                  <ul className="text-sm text-blue-600 mt-2 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
                      Low stock alerts help you maintain inventory levels proactively
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
                      Sound effects provide audio feedback during busy transactions
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Modal */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMethodModal(false)} />
          <div className="relative z-10 w-[500px] max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
                      </h2>
                      <p className="text-xs text-slate-300">Configure payment method details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMethodModal(false)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={methodForm.name}
                    onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                    placeholder="e.g., Credit 12 Months"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={methodForm.description}
                    onChange={(e) => setMethodForm({ ...methodForm, description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                  />
                </div>

                {/* Type and Credit Months */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={methodForm.type}
                      onChange={(e) => setMethodForm({ ...methodForm, type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="cash">Cash</option>
                      <option value="credit">Credit</option>
                      <option value="special">Special</option>
                    </select>
                  </div>
                  {methodForm.type === 'credit' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Credit Months
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={methodForm.credit_months}
                        onChange={(e) => setMethodForm({ ...methodForm, credit_months: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Icon and Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Icon
                    </label>
                    <select
                      value={methodForm.icon}
                      onChange={(e) => setMethodForm({ ...methodForm, icon: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="Wallet">Wallet</option>
                      <option value="CreditCard">Credit Card</option>
                      <option value="Heart">Heart</option>
                      <option value="Users">Users</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Color
                    </label>
                    <select
                      value={methodForm.color}
                      onChange={(e) => setMethodForm({ ...methodForm, color: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="emerald">Emerald</option>
                      <option value="blue">Blue</option>
                      <option value="indigo">Indigo</option>
                      <option value="purple">Purple</option>
                      <option value="pink">Pink</option>
                      <option value="amber">Amber</option>
                      <option value="teal">Teal</option>
                      <option value="violet">Violet</option>
                      <option value="red">Red</option>
                      <option value="gray">Gray</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Active</p>
                      <p className="text-xs text-gray-400">Method will appear during checkout</p>
                    </div>
                    <ToggleSwitch
                      enabled={methodForm.is_active}
                      onChange={(v) => setMethodForm({ ...methodForm, is_active: v })}
                    />
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Members Only</p>
                      <p className="text-xs text-gray-400">Only available for registered members</p>
                    </div>
                    <ToggleSwitch
                      enabled={methodForm.is_member_only}
                      onChange={(v) => setMethodForm({ ...methodForm, is_member_only: v })}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => setShowMethodModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMethod}
                  disabled={!methodForm.name || isSaving}
                  className="flex-1 py-3 bg-[#1A318C] text-white rounded-xl font-semibold hover:bg-[#152870] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingMethod ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesConfig;
