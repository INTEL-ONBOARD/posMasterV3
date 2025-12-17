import React from 'react'
//modal images
import successImage from '../../../assets/Success.png';
import failedImage from '../../../assets/Failed.png';

function StatusModal({isOpen, closeModal, type}) {

  if(!isOpen) return null;

  return (
            <div
              className="fixed inset-0 z-10 flex items-center justify-center"
              role="dialog"
              aria-modal="true"
            >
              {/* backdrop (click to close) */}
              <div
                className="absolute inset-0 bg-black opacity-60"
                //style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
                onClick={closeModal}
              />
    
              {/* close button top-left */}
              <button
                onClick={closeModal}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/90 text-white flex items-center justify-center z-[10001]"
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
    
              {/* modal content */}
              <div
                className="relative z-[10000] flex flex-col items-center justify-center text-center p-6"
                onClick={(e) => e.stopPropagation()}
                style={{
                  transition: 'transform 160ms ease, opacity 160ms ease'
                }}
              >
                <img
                  src={type === 'success' ? successImage : failedImage}
                  alt={type === 'success' ? 'Success' : 'Failed'}
                  className="w-24 h-24 object-contain"
                  style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.08))' }}
                />
    
                <h3 className="mt-4 text-2xl font-bold text-black">
                  {type === 'success' ? 'Success!' : 'Failed!'}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {type === 'success'
                    ? 'Transaction Complete.'
                    : 'Something went wrong, Try again.'}
                </p>
              </div>
            </div>
  )
}

export default StatusModal