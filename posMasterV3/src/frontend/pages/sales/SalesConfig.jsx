import { useState } from 'react';
import { ChevronRight, Settings, CreditCard, Receipt, Printer, Bell, Save, RotateCcw, Check } from 'lucide-react';

function SalesConfig({ isActive }) {
  const [selectedSection, setSelectedSection] = useState('payment');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [config, setConfig] = useState({
    defaultPaymentMethod: 'cash',
    enableCreditPayment: true,
    enableIncomePayment: true,
    maxCreditDuration: '6',
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

  const handleReset = () => {
    setConfig({
      defaultPaymentMethod: 'cash',
      enableCreditPayment: true,
      enableIncomePayment: true,
      maxCreditDuration: '6',
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
    { id: 'payment', label: 'Payment Settings', description: 'Configure payment methods and options', icon: CreditCard, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
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
              {sections.map((section) => {
                const Icon = section.icon;
                const isSelected = selectedSection === section.id;
                return (
                  <button
                    key={section.id}
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
        {/* Payment Settings */}
        <div className={selectedSection === 'payment' ? "h-full overflow-auto p-6" : "hidden"}>
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Default Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Default Payment Method
                  </label>
                  <select
                    value={config.defaultPaymentMethod}
                    onChange={(e) => setConfig({ ...config, defaultPaymentMethod: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Max Credit Duration (Months)
                  </label>
                  <select
                    value={config.maxCreditDuration}
                    onChange={(e) => setConfig({ ...config, maxCreditDuration: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Payment Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Enable Credit Payment</p>
                    <p className="text-xs text-gray-400 mt-0.5">Allow customers to pay with credit</p>
                  </div>
                  <ToggleSwitch enabled={config.enableCreditPayment} onChange={(v) => setConfig({ ...config, enableCreditPayment: v })} />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Enable Income Payment</p>
                    <p className="text-xs text-gray-400 mt-0.5">Allow members to use their income balance</p>
                  </div>
                  <ToggleSwitch enabled={config.enableIncomePayment} onChange={(v) => setConfig({ ...config, enableIncomePayment: v })} />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Require Cashier Authorization</p>
                    <p className="text-xs text-gray-400 mt-0.5">Require auth for high-value transactions</p>
                  </div>
                  <ToggleSwitch enabled={config.requireCashierAuth} onChange={(v) => setConfig({ ...config, requireCashierAuth: v })} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className={selectedSection === 'receipt' ? "h-full overflow-auto p-6" : "hidden"}>
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Receipt Content</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-700">Show Itemized Receipt</p><p className="text-xs text-gray-400 mt-0.5">Display individual items on receipt</p></div>
                  <ToggleSwitch enabled={config.showItemizedReceipt} onChange={(v) => setConfig({ ...config, showItemizedReceipt: v })} />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-700">Include Store Logo</p><p className="text-xs text-gray-400 mt-0.5">Print store logo on receipts</p></div>
                  <ToggleSwitch enabled={config.includeStoreLogo} onChange={(v) => setConfig({ ...config, includeStoreLogo: v })} />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-700">Include Store Address</p><p className="text-xs text-gray-400 mt-0.5">Show store address on receipts</p></div>
                  <ToggleSwitch enabled={config.includeStoreAddress} onChange={(v) => setConfig({ ...config, includeStoreAddress: v })} />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-700">Include Date & Time</p><p className="text-xs text-gray-400 mt-0.5">Display transaction timestamp</p></div>
                  <ToggleSwitch enabled={config.includeDateTime} onChange={(v) => setConfig({ ...config, includeDateTime: v })} />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-700">Show Barcode</p><p className="text-xs text-gray-400 mt-0.5">Print barcode on receipt</p></div>
                  <ToggleSwitch enabled={config.showBarcode} onChange={(v) => setConfig({ ...config, showBarcode: v })} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Footer Text</h3>
              <textarea
                value={config.receiptFooterText}
                onChange={(e) => setConfig({ ...config, receiptFooterText: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] text-sm resize-none"
                placeholder="Enter footer message..."
              />
            </div>
          </div>
        </div>

        {/* Printer Settings */}
        <div className={selectedSection === 'printer' ? "h-full overflow-auto p-6" : "hidden"}>
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Printer Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Printer Name</label>
                  <select value={config.printerName} onChange={(e) => setConfig({ ...config, printerName: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer">
                    <option value="Default Printer">Default Printer</option>
                    <option value="Receipt Printer 1">Receipt Printer 1</option>
                    <option value="Receipt Printer 2">Receipt Printer 2</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Paper Size</label>
                    <select value={config.paperSize} onChange={(e) => setConfig({ ...config, paperSize: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer">
                      <option value="58mm">58mm</option>
                      <option value="80mm">80mm</option>
                      <option value="A4">A4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Number of Copies</label>
                    <input type="number" min="1" max="5" value={config.copies} onChange={(e) => setConfig({ ...config, copies: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Print Options</h3>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-gray-700">Auto Print Receipt</p><p className="text-xs text-gray-400 mt-0.5">Automatically print after each sale</p></div>
                <ToggleSwitch enabled={config.autoPrint} onChange={(v) => setConfig({ ...config, autoPrint: v })} />
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start gap-3">
                <Printer className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Test Your Printer</p>
                  <p className="text-xs text-amber-600 mt-0.5">Print a test receipt to verify settings</p>
                  <button className="mt-2 h-8 px-4 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors">
                    Print Test Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className={selectedSection === 'notifications' ? "h-full overflow-auto p-6" : "hidden"}>
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Alert Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-700">Low Stock Alert</p><p className="text-xs text-gray-400 mt-0.5">Get notified when items are running low</p></div>
                  <ToggleSwitch enabled={config.lowStockAlert} onChange={(v) => setConfig({ ...config, lowStockAlert: v })} />
                </div>
                {config.lowStockAlert && (
                  <div className="pl-4 border-l-2 border-[#1A318C]/20">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Low Stock Threshold</label>
                    <input type="number" min="1" value={config.lowStockThreshold} onChange={(e) => setConfig({ ...config, lowStockThreshold: parseInt(e.target.value) || 10 })} className="w-32 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all" />
                  </div>
                )}
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-700">Sales Notifications</p><p className="text-xs text-gray-400 mt-0.5">Show notification after each sale</p></div>
                  <ToggleSwitch enabled={config.salesNotification} onChange={(v) => setConfig({ ...config, salesNotification: v })} />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-700">Sound Effects</p><p className="text-xs text-gray-400 mt-0.5">Play sounds for notifications</p></div>
                  <ToggleSwitch enabled={config.soundEnabled} onChange={(v) => setConfig({ ...config, soundEnabled: v })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesConfig;
