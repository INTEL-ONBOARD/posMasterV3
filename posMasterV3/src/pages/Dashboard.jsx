import React, { useState } from 'react';
import inventory from '../assets/inventory.png';
import logout from '../assets/logout.png';
import settings from '../assets/settings.png';
import viewmore from '../assets/viewmore.png';
import notification from '../assets/notification.png';
import Morawakle from '../assets/Morawakle.png';
import { CheckCircle, X } from 'lucide-react';


function Dashboard() {

const [selectedComponent, setSelectedComponent] = useState(null);
 

  const handleComponentClick = (componentName) => {
    setSelectedComponent(componentName);
   
  };

  const handleCloseModal = () => {
    setSelectedComponent(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 relative pt-3">
      {/* Success Notification */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-3 flex items-center gap-3 shadow-sm">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div className="flex items-center gap-2">
            <span className="text-green-800 font-medium text-sm">Success!</span>
            <span className="text-green-600 text-sm">NOTIFICATION MESSAGE SHOULD BE LIKE THIS</span>
          </div>
          <button className="ml-4 text-green-500 hover:text-green-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Header */}
      <div className="bg-white shadow-sm mt-24">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              <span className="text-blue-600">POS</span>
              <span className="text-gray-900"> MASTER</span>
              <span className="text-gray-700">.3</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`max-w-6xl mx-auto px-6 py-8 transition-all duration-300 ${
        selectedComponent ? 'blur-sm' : ''
      }`}>
        {/* First Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Store Info Card */}
          <div>
            <div
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200"
              onClick={() => handleComponentClick('store-info')}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center shadow-sm">
                  <img src={Morawakle} alt="Store" className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Morawakkorale Outlet</h2>
                  <p className="text-gray-500 text-sm">2025 - 05 - 23</p>
                </div>
              </div>
            </div>
          </div>
          {/* Settings Card */}
          <div>
            <div
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 h-full"
              onClick={() => handleComponentClick('settings')}
            >
              <div className="flex flex-col items-center text-center h-full justify-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                  <img src={settings} alt="Settings" className="w-8 h-8" />
                </div>
                <span className="text-gray-700 font-medium">Settings</span>
              </div>
            </div>
          </div>
          {/* Notifications Card */}
          <div>
            <div
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 h-full"
              onClick={() => handleComponentClick('notifications')}
            >
              <div className="flex flex-col items-center text-center h-full justify-center">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                  <img src={notification} alt="Notifications" className="w-8 h-8" />
                </div>
                <span className="text-gray-700 font-medium">Notifications</span>
              </div>
            </div>
          </div>
          {/* Log out Card */}
          <div>
            <div
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 h-full"
              onClick={() => handleComponentClick('logout')}
            >
              <div className="flex flex-col items-center text-center h-full justify-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                  <img src={logout} alt="Logout" className="w-8 h-8" />
                </div>
                <span className="text-gray-700 font-medium">Log out</span>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6">
          {/* Inventory Card */}
          <div>
            <div
              className="bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 overflow-hidden h-full"
              onClick={() => handleComponentClick('inventory')}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-16 flex items-center justify-center rounded-xl">
  <img src={inventory} alt="Inventory" className="w-50 h-12" />
</div>
                      
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-600">INVENTORY</h3>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
          {/* Empty Card 1 */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full"></div>
          </div>
          {/* Empty Card 2 */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full"></div>
          </div>
          {/* Empty Card 3 */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full"></div>
          </div>
          {/* View More Card */}
          <div>
            <div
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 h-full"
              onClick={() => handleComponentClick('view-more')}
            >
              <div className="flex items-center gap-4 h-full">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <img src={viewmore} alt="View More" className="w-8 h-8" />
                </div>
                <span className="text-gray-700 font-medium">View More</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Loading Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white p-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {selectedComponent && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div
      className={`bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl
        ${selectedComponent === 'view-more' ? 'h-96 overflow-y-auto' : ''}
      `}
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {selectedComponent === 'store-info' && <img src={Morawakle} alt="Store" className="w-8 h-8" />}
          {selectedComponent === 'notifications' && <img src={notification} alt="Notifications" className="w-8 h-8" />}
          {selectedComponent === 'settings' && <img src={settings} alt="Settings" className="w-8 h-8" />}
          {selectedComponent === 'inventory' && <img src={inventory} alt="Inventory" className="w-8 h-8" />}
          {selectedComponent === 'logout' && <img src={logout} alt="Logout" className="w-8 h-8" />}
          {selectedComponent === 'view-more' && <img src={viewmore} alt="View More" className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-semibold mb-2 capitalize text-gray-900">
          {selectedComponent.replace('-', ' ')} Selected
        </h3>
        <p className="text-gray-600 mb-6 leading-relaxed">
          You clicked on the {selectedComponent.replace('-', ' ')} component.
        </p>
         {/* Add extra content for demonstration */}
        {selectedComponent === 'view-more' && (
          <div>
            <p className="mb-2">This is a scrollable modal. Add your content here.</p>
            {[...Array(20)].map((_, i) => (
              <p key={i} className="text-gray-400 text-sm">Scrollable content line {i + 1}</p>
            ))}
          </div>
        )}
        <button
          onClick={handleCloseModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors font-medium shadow-sm mt-4"
        >
          Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard