export default function Add_item_Card({ item, onOpen, onRemove }) {
  return (
   <div 
  className="relative bg-white w-65 h-50 border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
  onClick={onOpen}
  role="button"
  tabIndex={0}
>
  {/* Close icon at top right */}
 <button
  className="absolute top-2 left-2 z-10 p-0.5 bg-black rounded-full hover:bg-gray-800 flex items-center justify-center"
  onClick={(e) => {
    e.stopPropagation();
    if (onRemove) onRemove(item.id);
  }}
  aria-label="Close"
  type="button"
>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6"/>
  </svg>
</button>
      <div className="flex flex-row bg-white justify-between">
        <div className="flex flex-col items-center justify-center bg-white">
          <img src={item.image} alt={item.name} className="w-48 bg-white object-contain" />
          {/* SKU row */}
          <div className="flex flex-row items-center mt-1">
            {item.sku && (
              <span className="flex flex-row items-center">
                <p className="text-md text-black font-light mr-2">SKU:</p>
                <p className="text-md text-[#A7A7A7] font-light">{item.sku}</p>
              </span>
            )}
          </div>
        </div>

        {/* Right column: name, category, price/unit, KG/G row */}
        <div className="flex flex-col justify-between bg-white mr-8 h-full">
          <div>
            <h3 className="text-2xl text-black font-semibold mt-1">{item.name}</h3>
            <h3 className="text-base font-semibold text-[#A7A7A7]">{item.category}</h3>
            <p className="text-base text-black font-semibold">
              Rs.{item.price}<span className="text-sm">/{item.unit}</span>
            </p>
          </div>
          {/* KG/G row aligned at the bottom, horizontally with the above */}
          <div className="flex flex-row items-center gap-2 mt-11">
            <p className="text-md text-gray-500">KG/G</p>
            <p className="text-md text-gray-500">20KG</p>
            <div className="w-4 h-4 bg-green-500 rounded-full mt-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
}