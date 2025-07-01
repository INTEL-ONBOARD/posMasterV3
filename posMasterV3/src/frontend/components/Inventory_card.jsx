export default function Inventory_card({ item, onOpen, onRemove }) {
  return (
    <div 
      className="bg-white  w-65 h-50 border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={onOpen} // Add onClick handler here
      role="button" // Accessibility improvement
      tabIndex={0} // Make focusable for keyboard accessibility
    >
      
     

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