import React, { useState } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Routes,
  BrowserRouter,
  Route,
  RouterProvider,
} from "react-router-dom";

import './App.css';
// import Desktop1 from './frontend/components/Desktop1.jsx';
// import Desktop2 from './frontend/components/Desktop2.jsx';
// import Desktop3 from './frontend/components/Desktop3.jsx';
// import Desktop4 from './frontend/components/Desktop4.jsx'; 

import Intro from './pages/Intro.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import Inventory from './pages/inventory/Inventory.jsx';
import ToastProvider from './pages/toasts/ToastProvider.jsx';

// import AddItem from './pages/inventory/AddItem.jsx';
// import Configurations from './pages/inventory/Configurations.jsx';
// import InvReport from './pages/inventory/InvReport.jsx';

// //routing configurations added to App.jsx
// const router = createBrowserRouter(
//   createRoutesFromElements(
//     <Route path="/" element={<Intro />}>

//       <Route path="login" element={<Login />} />

//       {/* ─── Private routing when needed(disabled for now)─── */}
//       {/* <Route element={<ProtectedRoute />}> */}
//         <Route path="dashboard" element={<Dashboard />}>

//           <Route path="inventory" element={<Inventory />} >
//             <Route path="add" element={<AddItem />}/>
//             <Route path="config" element={<Configurations />}/>
//             <Route path="reports" element={<InvReport />}/>
//           </Route>

          
//         </Route>
//       {/* </Route> */}

//       <Route path="*"     element={<NotFound />} />
//     </Route>
//   )
// );

function App() {
  const [currentView, setCurrentView] = useState('desktop1');

  return (

    <ToastProvider>

    <BrowserRouter>
      <Routes>
        <Route index element={<Intro />} />
        <Route path="login" element={<Login />} />

        {/* ─── Private routing when needed(disabled for now)─── */}
        {/* <Route element={<ProtectedRoute />}> */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard/inventory" element={<Inventory />} />
        {/* <Route path="dashboard/inventory/add" element={<AddItem />} />
        <Route path="dashboard/inventory/config" element={<Configurations />} />
        <Route path="dashboard/inventory/reports" element={<InvReport />} /> */}

        {/* </Route> */}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>

    </ToastProvider>

    // hover blur effect example is here_____________________________________________________________________________________________________________________

    // <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-8 relative overflow-hidden">
    //   {/* Background element that will be blurred */}
    //   <div 
    //     id="background" 
    //     className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80')] bg-cover bg-center"
    //   ></div>
      
    //   {/* Overlay to darken the background */}
    //   <div className="absolute inset-0 bg-black/50"></div>
      
    //   {/* Content */}
    //   <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
    //     <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 text-center">
    //       Card Hover Effect
    //     </h1>
    //     <p className="text-lg text-white/80 mb-12 max-w-2xl text-center">
    //       Hover over either card to see the background blur effect
    //     </p>
        
    //     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
    //       {/* Card 1 */}
    //       <div 
    //         className="card bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-105"
    //         onMouseEnter={() => {
    //           document.getElementById('background').classList.add('blur-lg');
    //         }}
    //         onMouseLeave={() => {
    //           document.getElementById('background').classList.remove('blur-lg');
    //         }}
    //       >
    //         <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mb-6" />
    //         <h2 className="text-2xl font-bold text-white mb-4">Web Development</h2>
    //         <p className="text-white/80 mb-6">
    //           Build responsive websites with modern frameworks. Create engaging user experiences with the latest web technologies.
    //         </p>
    //         <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">
    //           Learn More
    //         </button>
    //       </div>
          
    //       {/* Card 2 */}
    //       <div 
    //         className="card bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-105"
    //         onMouseEnter={() => {
    //           document.getElementById('background').classList.add('blur-lg');
    //         }}
    //         onMouseLeave={() => {
    //           document.getElementById('background').classList.remove('blur-lg');
    //         }}
    //       >
    //         <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mb-6" />
    //         <h2 className="text-2xl font-bold text-white mb-4">UI/UX Design</h2>
    //         <p className="text-white/80 mb-6">
    //           Craft intuitive interfaces with user-centered design principles. Create beautiful experiences that users love.
    //         </p>
    //         <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">
    //           Learn More
    //         </button>
    //       </div>
    //     </div>
        
    //     <div className="mt-16 text-center text-white/70">
    //       <p>Move your mouse over either card to see the effect</p>
    //     </div>
    //   </div>
    // </div>
  

  
    );
  
}

export default App;