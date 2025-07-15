export default function SalesItemCard({ item, onOpen, }) {
  return (
    <div 
      className="bg-white w-[28rem] h-[15rem] border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
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
          <div className="flex flex-col justify-end items-end">
            <h3 className="text-2xl text-black font-bold mt-1">{item.name}</h3>
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