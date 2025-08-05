const PaymentSection = ({ onClose, totalAmount }) => {
  return (
    <div className="bg-white flex-1 flex flex-col rounded-lg shadow-lg">
      {/* Header with close button */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-bold">Payment Processing</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      </div>

      {/* Payment Form */}
      <div className="flex-1 p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Amount
          </label>
          <div className="text-xl font-bold">Rs.{totalAmount.toFixed(2)}</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select className="w-full p-2 border rounded">
            <option>Cash</option>
            <option>Credit Card</option>
            <option>Debit Card</option>
            <option>Mobile Payment</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount Received
          </label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            placeholder="Enter amount"
          />
        </div>

        <button className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
          Complete Payment
        </button>
      </div>
    </div>
  );
};