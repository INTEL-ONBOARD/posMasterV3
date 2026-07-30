import React from "react";

export default function SectionShell({
  title,
  subtitle,
  icon,
  rightSlot,
  children,
  showHeader = true,
  bodyClassName = "p-5",
  className = "",
  headerClassName = "flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4",
  titleClassName = "text-base font-semibold text-slate-800",
  subtitleClassName = "text-xs leading-tight text-slate-500",
}) {
  const IconComponent = icon;
  return (
    <div className={`rounded-3xl border border-slate-100 bg-white shadow-sm ${className}`.trim()}>
      {showHeader ? (
        <div className={headerClassName}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A318C]/10 text-[#1A318C]">
              {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
            </div>
            <div>
              <h3 className={titleClassName}>{title}</h3>
              <p className={subtitleClassName}>{subtitle}</p>
            </div>
          </div>
          {rightSlot}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
