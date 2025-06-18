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
  verticalLayout = false,
  ...props
}) {
  if (verticalLayout) {
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 overflow-hidden flex flex-col items-center justify-center ${className}`}
        onClick={onClick}
        {...props}
      >
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
          {title && (
            <h3
              className="mb-1"
              style={{
                color: "#00489A",
                fontWeight: "bold",
                fontSize: "28px",
                lineHeight: "1.1",
              }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <div className="w-full flex justify-end mb-3">
              <span
                className="px-3 py-1 rounded-full"
                style={{
                  background: "#00489A",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {subtitle}
              </span>
            </div>
          )}
          {image && (
            <img
              src={image}
              alt={title || "card"}
              className={`w-16 h-16 object-contain ${imageClass}`}
            />
          )}
        </div>
      </div>
    );
  }
  if (fullImage && image) {
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-200 overflow-hidden flex flex-col items-center justify-center ${className}`}
        onClick={onClick}
        {...props}
      >
        <div className="flex flex-col items-center justify-center w-full h-full">
          <img
            src={image}
            alt={title || "card"}
            className={`w-16 h-16 object-contain mb-2 ${imageClass}`}
          />
          {title && (
            <p className="text-center text-base font-semibold text-gray-700 mt-0">
              {title}
            </p>
          )}
        </div>
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
          {title && (
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          )}
          {subtitle && <p className="text-gray-500 text-lg">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardCard;
