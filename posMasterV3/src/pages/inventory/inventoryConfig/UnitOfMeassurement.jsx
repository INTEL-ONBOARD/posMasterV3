import React, { useState } from "react";
function UnitOfMeassurement() {

    const initialUnits = [
  { id: 1, name: "Kilo Gram", symbol: "KG" },
  { id: 2, name: "Gram", symbol: "g" },
  { id: 3, name: "Number", symbol: "n" },
  { id: 4, name: "Milliliter", symbol: "ml" },
  { id: 5, name: "Packs", symbol: "pcs" },
];

  const [units, setUnits] = useState(initialUnits);
  const [unitName, setUnitName] = useState("");
  const [unitSymbol, setUnitSymbol] = useState("");
  
  const handleAddUnit = () => {
    if (unitName && unitSymbol) {
      setUnits([
        ...units,
        { id: units.length + 1, name: unitName, symbol: unitSymbol },
      ]);
      setUnitName("");
      setUnitSymbol("");
    }
  };

  const handleClear = () => {
    setUnitName("");
    setUnitSymbol("");
  };

  return (
      <div className="flex-1 h-[calc(100vh-6rem)] bg-white flex justify-between flex-col px-8 py-8">
        <div>

        
        <h2 className="text-2xl font-bold text-gray-400 mb-6">UNIT OF MEASUREMENT</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Add New Unit here"
            className="flex-1 border border-gray-300  px-4 py-2 bg-[#F8F8F8]"
            value={unitName}
            onChange={e => setUnitName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Unit symbol"
            className="w-40 border border-gray-300  px-4 py-2 bg-[#F8F8F8]"
            value={unitSymbol}
            onChange={e => setUnitSymbol(e.target.value)}
          />
          <button
            className="bg-gray-400 text-white px-3 "
            onClick={handleClear}
            title="Clear"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            className="bg-green-600 text-white px-3 py-2 "
            onClick={handleAddUnit}
            title="Add"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
        <table className="w-full border-collapse bg-[#F8F8F8] ">
          <thead>
            <tr className="text-left text-gray-500 font-semibold">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">UNIT NAME</th>
              <th className="px-4 py-2">UNIT SYMBOL</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-b border-gray-200 text-gray-700">
                <td className="px-4 py-2">{unit.id}</td>
                <td className="px-4 py-2">{unit.name}</td>
                <td className="px-4 py-2">{unit.symbol}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {/* Bottom bar */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            className="px-8 py-2 bg-gray-500 text-white  hover:bg-gray-600"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            className="px-8 py-2 bg-blue-900 text-white  hover:bg-blue-800"
            // onClick={handleSave} // Implement save logic if needed
          >
            Save
          </button>
        </div>
      </div>
  )
}

export default UnitOfMeassurement