import React, { useState } from 'react';
import './App.css';
import Desktop1 from './frontend/components/Desktop1.jsx';
import Desktop2 from './frontend/components/Desktop2.jsx';
import Desktop3 from './frontend/components/Desktop3.jsx';
import Desktop4 from './frontend/components/Desktop4.jsx'; 


function App() {
  const [currentView, setCurrentView] = useState('desktop1');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCurrentView('desktop1')}
          className={`px-3 py-1 text-xs rounded ${
            currentView === 'desktop1'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border'
          }`}
        >
          Desktop 1
        </button>
        <button
          onClick={() => setCurrentView('desktop2')}
          className={`px-3 py-1 text-xs rounded ${
            currentView === 'desktop2'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border'
          }`}
        >
          Desktop 2
        </button>
        <button
          onClick={() => setCurrentView('desktop3')}
          className={`px-3 py-1 text-xs rounded ${
            currentView === 'desktop3'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border'
          }`}
        >
          Desktop 3
        </button>
        
        <button
          onClick={() => setCurrentView('desktop4')}
          className={`px-3 py-1 text-xs rounded ${
            currentView === 'desktop4'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border'
          }`}
        >
          Desktop 4
        </button>
      </div>

      {/* Render current view */}
      {currentView === 'desktop1' && <Desktop1 />}
      {currentView === 'desktop2' && <Desktop2 />}
      {currentView === 'desktop3' && <Desktop3 />}
      {currentView === 'desktop4' && <Desktop4 />}
    </div>
  );
}

export default App;