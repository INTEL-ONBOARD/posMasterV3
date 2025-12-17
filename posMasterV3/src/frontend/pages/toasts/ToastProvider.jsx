import React, { useState } from 'react';
import ToastContext from './ToastService';

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [exiting, setExiting] = useState({});

  const open = (message = '', timeout = 5000, title = 'Success', status = 'info') => {
    const id = Date.now();
    setToasts((toasts) => [...toasts, { id, message, title, status }]);
    setTimeout(() => handleClose(id), timeout);
    return id;
  };

  const handleClose = (id) => {
    setExiting((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setToasts((toasts) => toasts.filter((toast) => toast.id !== id));
      setExiting((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }, 500);
  };

  // Map for background, border, and text color
  const statusStyleMap = {
    success: {
      bg: 'bg-green-400 bg-opacity-20',
      border: 'border-green-600',
      text: 'text-green-600'
    },
    warning: {
      bg: 'bg-yellow-400 bg-opacity-20',
      border: 'border-yellow-600',
      text: 'text-yellow-600'
    },
    fail: {
      bg: 'bg-orange-400 bg-opacity-20',
      border: 'border-orange-600',
      text: 'text-orange-600'
    },
    info: {
      bg: 'bg-gray-400 bg-opacity-20',
      border: 'border-gray-600',
      text: 'text-gray-600'
    },
    error: {
      bg: 'bg-red-400 bg-opacity-20',
      border: 'border-red-600',
      text: 'text-red-600'
    }
  };

  const statusIconMap = {
    success: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    warning: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    ),
    fail: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    info: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    error: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    )
  };

  return (
    <ToastContext.Provider value={{ open, close: handleClose }}>
      {children}
      <div className="space-y-2 fixed right-6 top-24 z-50">
        {toasts.map((toast) => {
          const { bg, border, text } = statusStyleMap[toast.status] || statusStyleMap.success;
          const icon = statusIconMap[toast.status] || statusIconMap.success;

          return (
            <div
              key={toast.id}
              className={`transition-all duration-500 ease-in-out transform ${exiting[toast.id] ? 'animate-slide-out-right' : 'animate-slide-in-right'
                }`}
            >
              <div
                className={`${bg} ${border} ${text} border rounded-lg px-10 py-6 flex items-center gap-4 shadow-sm min-w-[300px] max-w-[400px] backdrop-blur-sm`}
                role="alert"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {icon}
                </svg>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{toast.title}</span>
                  <span className="text-sm opacity-80">{toast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleClose(toast.id)}
                  className={`ml-4 hover:text-current transition-colors ${text}`}
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
