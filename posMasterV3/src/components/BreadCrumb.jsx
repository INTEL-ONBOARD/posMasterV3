import React from 'react'
import { useLocation, Link } from 'react-router-dom'

function BreadCrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <nav className="text-sm py-2 px-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {/* <li>
          <Link to="/" className="text-[#1A318C] font-semibold">POS MASTER.3</Link>
        </li> */}
        {pathnames.map((name, idx) => {
          const routeTo = '/' + pathnames.slice(0, idx + 1).join('/');
          const isLast = idx === pathnames.length - 1;
          return (
            <li key={routeTo} className="flex items-center space-x-2">
              {/* Arrow icon */}
              <svg className="w-4 h-4 text-[#1A318C] mx-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {isLast ? (
                <span className="text-[#1A318C] font-bold uppercase tracking-wide">{decodeURIComponent(name)}</span>
              ) : (
                <Link to={routeTo} className="text-[#1A318C] font-semibold uppercase tracking-wide">
                  {decodeURIComponent(name)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default BreadCrumb