import React from 'react';

const RightSectionModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay that only covers right section */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-10" 
        onClick={onClose}
        style={{ left: '50%' }}
      ></div>
      
      {/* Modal Content */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg shadow-lg z-20 w-96">
        {children}
        <button 
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Close Modal
        </button>
      </div>
    </>
  );
};

export default RightSectionModal;