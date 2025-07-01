import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InventorySidebar from './Inventory_sidebar';
import InventoryCard from '../../frontend/components/Inventory_card';
import SpinnerDot from '../../frontend/components/SpinnerDot';
import bananaImg from '../../assets/Inventory_banana.png';
import AddItem from './AddItem';


function Inventory() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('view-inventory');

  // Example inventory data
const [inventoryItems, setInventoryItems] = useState([
  {
    id: '1',
    name: 'Banana',
    barcode: 'SKU-37847324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU001',
    stock: 100,
    image: bananaImg
  },
   {
    id: '2',
    name: 'Banana',
    barcode: 'SKU-5837324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '3',
    name: 'Banana',
    barcode: 'SKU-58394324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '4',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '5',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '6',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '7',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '8',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '9',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  // Add more items as needed
]);

  return (
    <div id="inv-background" className="flex h-screen bg-[#EBEBEB] -ml-12">
      {/* sidebar (left) */}
      <InventorySidebar
        activeSection={activeSection}
        onViewInvClick={() => setActiveSection('view-inventory')}
        onAddItemClick={() => setActiveSection('add-item')}
        onConfigClick={() => setActiveSection('inventory-config')}
        onCReportClick={() => setActiveSection('inventory-report')}
      />

      {/* main section selected from sidebar(right) */}
      <main className="flex-1 bg-[#F3F3F3] ">
        {/* Conditional Rendering */}
        {activeSection === 'view-inventory' && (
          // item list
          <div className="grid pr-20 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventoryItems.map(item => (
              <InventoryCard 
                key={item.id} 
                item={item} 
                onOpen={() => navigate(`/dashboard/inventory/edit-item/${item.id}`)} 
              />
            ))}
          </div>
        )}

        {activeSection === 'add-item' && <div><AddItem/></div>}

        {activeSection === 'inventory-config' && <div>this is config</div>}

        {activeSection === 'inventory-report' && <div>this is inv report</div>}

      </main>

      {/* Loading Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white py-2">
        <div className="flex items-center gap-1 justify-start ml-5">
          <SpinnerDot />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
}

export default Inventory;