import React from 'react';

function NotificationCard({
  title = "Notification",
  description = "",
  date = "",
  onClose = () => {}
}) {
  return (
    <div>
      {/* notifications card */}
      <div className='w-[68rem] h-[7rem] bg-gray-200 flex flex-row'>
        {/* content (left)*/}
        <div className='w-full flex flex-col justify-center px-4'>
          <p className='text-sm font-medium'>{title}</p>
          <p className='text-xs text-gray-700'>{description}</p>
        </div>

        {/* close button and time section (right) */}
        <div className='w-[10rem] flex flex-row items-center gap-3 justify-end pr-4'>
          <p className='text-xs text-gray-600'>{date}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification"
            className="w-7 h-7 rounded-full bg-black inline-flex items-center justify-center focus:outline-none"
          >
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationCard;
