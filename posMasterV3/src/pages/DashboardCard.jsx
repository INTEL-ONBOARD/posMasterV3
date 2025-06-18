import React from "react";

function DashboardCard({
  onClick,
  className = "",
  image,
  imageClass = "",
  title,
  subtitle,
  badge,
  children,
   fullImage = false, // NEW PROP
  ...props
}) {
  if (fullImage && image) {
    // Render only the image, filling the card
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 overflow-hidden ${className}`}
        onClick={onClick}
        {...props}
      >
        <img src={image} alt={title || "card"} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 overflow-hidden ${className}`}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center gap-4 h-full p-6">
        {image && (
          <div className="relative flex items-center justify-center">
            <img src={image} alt={title} className={imageClass} />
            {badge && (
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                {badge}
              </div>
            )}
          </div>
        )}
        <div>
          {title && <h3 className="text-xl font-bold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-gray-500 text-lg">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardCard;