import React from 'react';
import { X, Bell, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

function NotificationCard({
  title = "Notification",
  description = "",
  date = "",
  type = "info", // 'info' | 'success' | 'warning' | 'error'
  onClose = () => { }
}) {
  // Type-based styling configuration
  const typeConfig = {
    info: {
      icon: Info,
      iconBg: 'bg-[#1A318C]/10',
      iconColor: 'text-[#1A318C]',
      borderColor: 'border-l-[#1A318C]'
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-l-emerald-500'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-l-amber-500'
    },
    error: {
      icon: AlertCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-l-red-500'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const IconComponent = config.icon;

  return (
    <div className="w-full notification-item group">
      <div className={`w-full bg-white border border-gray-100 border-l-4 ${config.borderColor} rounded-xl px-4 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300`}>
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{title}</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{description}</p>
        </div>

        {/* Date & Close */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400 whitespace-nowrap">{date}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification"
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 inline-flex items-center justify-center transition-colors duration-200 group-hover:opacity-100 opacity-50"
          >
            <X className="w-4 h-4 text-gray-500 hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationCard;
