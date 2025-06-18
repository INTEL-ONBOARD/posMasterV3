import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InventorySidebar from './Inventory_sidebar';
import InventoryCard from './Inventory_card';
import AddItemModal from './AddItem_modal';
import Configurations from './Configurations';
import bananaImg from '../../assets/Inventory_banana.png';
import SpinnerDot from '../SpinnerDot';
// Example inventory data
const inventoryItems = [
  {
    id: '1',
    name: 'Banana',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU001',
    stock: 100,
    image: bananaImg
  },
   {
    id: '2',
    name: 'Banana',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '3',
    name: 'Banana',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '4',
    name: 'Banana',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  // Add more items as needed
];

function Inventory() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeSection, setActiveSection] = useState('inventory-list');
  // Show modal if route matches
  const isAddItemOpen = location.pathname.endsWith('/add-item');
  const isConfigOpen = location.pathname.endsWith('/config');

  return (
    // id here controls the blur thingyy
    <div id="inv-background"  className="flex h-screen bg-red-400 p-24">
      {/* inventory sidebar */}

      <InventorySidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onAddItemClick={() => navigate('/dashboard/inventory/add-item')}
        onConfigClick={() => navigate('/dashboard/inventory/config')}
        
      />
      {/* main section */}
      <main className="flex-1 p-14 bg-green-300">

        <div className="grid pr-20 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {inventoryItems.map(item => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      </main>
      
      {/* Bottom Loading Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white py-2">
        <div className="flex items-center gap-1 justify-start  ml-5">
          <SpinnerDot />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>


      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => navigate('/dashboard/inventory')}
        onSave={(item) => {
          // handle save logic here
          navigate('/dashboard/inventory');
        }}
      />

      <Configurations
        isOpen={isConfigOpen}
        onClose={() => navigate('/dashboard/inventory')}
        onSave={(units) => {
        // handle save logic here
        navigate('/dashboard/inventory');
  }}
/>
    </div>
  );
}

export default Inventory;