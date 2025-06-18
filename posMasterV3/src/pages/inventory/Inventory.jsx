import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InventorySidebar from './Inventory_sidebar';
import InventoryCard from './Inventory_card';
import AddItemModal from './AddItem_modal';
import Configurations from './Configurations';
import bananaImg from '../../assets/Inventory_banana.png';
// Example inventory data
const inventoryItems = [
  {
    id: '1',
    name: 'Banana',
    price: '80',
    unit: 'KG',
    sku: 'SKU001',
    stock: 100,
    image: bananaImg
  },
   {
    id: '1',
    name: 'Banana',
    price: '80',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  // Add more items as needed
];

function Inventory() {
  const [activeSection, setActiveSection] = useState('inventory-list');
  const navigate = useNavigate();
  const location = useLocation();

  // Show modal if route matches
  const isAddItemOpen = location.pathname.endsWith('/add-item');
  const isConfigOpen = location.pathname.endsWith('/config');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <InventorySidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onAddItemClick={() => navigate('/dashboard/inventory/add-item')}
        onConfigClick={() => navigate('/dashboard/inventory/config')}
        
      />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-6">Inventory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {inventoryItems.map(item => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      </main>
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