import React from 'react';

function NotificationCard({
  title = "Notification",
  description = "",
  date = "",
  onClose = () => { }
}) {
  return (
    <div className="w-full notification-item">
      <div className="w-full bg-gray-50 border border-gray-200 px-4 py-4 flex items-center justify-between animate-fade-up hover-pop">
        <div className="flex-1 pr-4">
          <p className="text-base font-semibold text-gray-700 leading-tight">{title}</p>
          <p className="text-sm text-gray-400 mt-1 truncate">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400 whitespace-nowrap">{date}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification"
            className="w-7 h-7 rounded-full bg-gray-300 inline-flex items-center justify-center focus:outline-none"
          >
            <svg
              className="w-3 h-3 text-white"
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
