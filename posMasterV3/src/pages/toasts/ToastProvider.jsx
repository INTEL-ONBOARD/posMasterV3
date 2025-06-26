import React, { useState } from 'react';
import ToastContext from './ToastService';

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [exiting, setExiting] = useState({});

  const open = (message = '', timeout = 5000) => {
    const id = Date.now();
    setToasts((toasts) => [...toasts, { id, message }]);
    setTimeout(() => handleClose(id), timeout);
    return id;
  };
 // When closing, mark as exiting, then remove after animation
  const handleClose = (id) => {
    setExiting((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setToasts((toasts) => toasts.filter((toast) => toast.id !== id));
      setExiting((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }, 500); // match animation duration
  };

  return (
    <ToastContext.Provider value={{ open, close: handleClose }}>
      {children}
      <div className="space-y-2 fixed right-6 top-20 z-50">
        {toasts.map(({ id, message }) => (
          <div
            key={id}
            className={`transition-all duration-500 ease-in-out transform ${
              exiting[id] ? 'animate-slide-out-right' : 'animate-slide-in-left'
            }`}
          >
            <div
              className="bg-[#D9D9D9] border border-gray-300 rounded-lg px-10 py-6 flex items-center gap-4 shadow-sm min-w-[300px] max-w-[400px]"
              role="alert"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex items-center gap-2">
                <span className="text-black font-medium text-sm">Success!</span>
                <span className="text-[#AAAAAA] text-sm">{message}</span>
              </div>
              <button
                type="button"
                onClick={() => handleClose(id)}
                className="ml-4 text-gray-500 hover:text-black transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;