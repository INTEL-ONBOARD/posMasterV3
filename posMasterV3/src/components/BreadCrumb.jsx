import React from 'react'
import { useLocation, Link } from 'react-router-dom'

function BreadCrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <nav className="text-sm text-gray-500 py-2 px-4" aria-label="Breadcrumb">
      <ol className="list-reset flex">
        <li>
          <Link to="/" className="hover:underline text-blue-600">Home</Link>
        </li>
        {pathnames.map((name, idx) => {
          const routeTo = '/' + pathnames.slice(0, idx + 1).join('/');
          const isLast = idx === pathnames.length - 1;
          return (
            <li key={routeTo} className="flex items-center">
              <span className="mx-2">/</span>
              {isLast ? (
                <span className="text-gray-700 font-semibold capitalize">{decodeURIComponent(name)}</span>
              ) : (
                <Link to={routeTo} className="hover:underline capitalize text-blue-600">
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