import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InventorySidebar from './Inventory_sidebar';
import InventoryCard from '../../frontend/components/Inventory_card';
import AddItemModal from './AddItem_modal';
import Configurations from './Configurations';
import bananaImg from '../../assets/Inventory_banana.png';
import SpinnerDot from '../../frontend/components/SpinnerDot';
import EditItemModal from './EditItem_modal';



function Inventory() {

    const navigate = useNavigate();
  const location = useLocation();

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
  // Add more items as needed
]);

// Get item ID from URL
  const getEditingItemId = () => {
    const pathParts = location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  };

  const editingItem = inventoryItems.find(
    item => item.id === getEditingItemId()
  );



  
  const [activeSection, setActiveSection] = useState('inventory-list');
  // Show modal if route matches
  const isAddItemOpen = location.pathname.endsWith('/add-item');
  const isEditItemOpen = location.pathname.includes('/edit-item/');
  const isConfigOpen = location.pathname.endsWith('/config');

  return (
    // id here controls the blur thingyy
    <div id="inv-background"  className="flex h-screen bg-[#EBEBEB] p-24 ">
      {/* <div id="inv-background"  className={`flex h-screen bg-red-400 p-24 ${ (isAddItemOpen || isConfigOpen) ? 'blur-md' : 'blur-none' }`}> */}
      {/* inventory sidebar */}

      <InventorySidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onAddItemClick={() => navigate('/dashboard/inventory/add-item')}
        onConfigClick={() => navigate('/dashboard/inventory/config')}
      />
      {/* main section */}
      <main className="flex-1 p-14 bg-[#F3F3F3] rounded-r-2xl">

        {/* inventory card list */}
        <div className="grid pr-20 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-6">
          {inventoryItems.map(item => (
            <InventoryCard key={item.id} item={item} onOpen={() => navigate(`/dashboard/inventory/edit-item/${item.id}`)} onRemove={{/* TODO */}} />
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

      <EditItemModal
        isOpen={isEditItemOpen}
        item={editingItem}
        onClose={() => navigate('/dashboard/inventory')}
        onUpdate={(updatedItem) => {
          setInventoryItems(prevItems => 
            prevItems.map(item => 
              item.id === updatedItem.id ? {...item, ...updatedItem} : item
            )
          );
          navigate('/dashboard/inventory');
        }}
      />

    </div>
  );
}

export default Inventory;