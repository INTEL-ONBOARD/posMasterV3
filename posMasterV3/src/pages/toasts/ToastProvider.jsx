import React, { useState } from 'react';
import ToastContext from './ToastService';

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const open = (message = '', timeout = 5000) => {
    const id = Date.now();
    setToasts((toasts) => [...toasts, { id, message }]);
    setTimeout(() => close(id), timeout);
    return id;
  };

  const close = (id) => setToasts((toasts) => toasts.filter((toast) => toast.id !== id));

  return (
     <ToastContext.Provider value={{ open, close }}>
      {children}
      <div className="space-y-2 fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
        {toasts.map(({ id, message }) => (
          <div key={id}>
            <div className="bg-green-50 border border-green-200 rounded-lg px-10 py-6 flex items-center gap-4 shadow-sm min-w-[800px] max-w-[1200px]" role="alert">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex items-center gap-2">
                <span className="text-green-800 font-medium text-sm">Success!</span>
                <span className="text-green-600 text-sm">{message}</span>
              </div>
              <button
                type="button"
                onClick={() => close(id)}
                className="ml-4 text-green-500 hover:text-green-700 transition-colors"
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