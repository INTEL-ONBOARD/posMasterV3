export default function Inventory_card({ item, onOpen, onRemove }) {
  return (
    <div 
      className="bg-white rounded-2xl w-120 h-60 border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={onOpen} // Add onClick handler here
      role="button" // Accessibility improvement
      tabIndex={0} // Make focusable for keyboard accessibility
    >
      {/* Close button with propagation prevention */}
      <button 
        aria-label="Close"
        className="bg-black rounded-full p-1 shadow hover:bg-gray-600 active:bg-gray-200 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering card's onClick
          onClose();
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6"/>
        </svg>
      </button>

      {/* Card content remains unchanged */}
      <div className='flex flex-row bg-white justify-between'>
        <div className="flex flex-col items-center justify-center bg-white">
          <img src={item.image} alt={item.name} className="w-48 bg-white object-contain" />
          {item.sku && (
            <span className='flex flex-row mt-1'>
              <p className="text-md text-black font-light mr-2">SKU:</p>
              <p className="text-md text-[#A7A7A7] font-light">{item.sku}</p>
            </span>
          )}
        </div>

        <div className="text-end bg-white mr-8">
          <h3 className="text-3xl text-black font-semibold mt-1">{item.name}</h3>
          <h3 className="font-bold text-[#A7A7A7]">{item.category}</h3>
          <p className="text-3xl text-black font-semibold">
            Rs.{item.price}<span className="text-xl">/{item.unit}</span>
          </p>
          <div className='flex flex-row justify-end mt-7 gap-2'>
            <p className='text-md text-gray-500'>KG/G</p>
            <p className='text-md text-gray-500'>20KG</p>
            <div className="w-4 h-4 bg-green-500 rounded-full mt-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
}