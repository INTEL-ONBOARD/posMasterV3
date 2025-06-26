import React from 'react'
import {Link} from 'react-router-dom'
import { useContext } from 'react';
import BreadCrumb from './BreadCrumb';
//import { AuthContext } from '../auth/authContext';

function Header() {

  return (
    <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="px-3 py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start rtl:justify-end">
            {/* in case user wanted to navigate somewhere hrrngh */}
            <Link to="/login" className="flex flex-col ms-2">
              <h1 className='text-2xl font-bold text-[#3E3F43]'>POS Master.3</h1>
              <h2>Version 2.3EF</h2>
            </Link>
            <BreadCrumb/>
          </div>
          <div className="flex items-center">
            <div className="flex flex-row items-center gap-2 ms-3">

              <img className="w-10 h-10 rounded-full" src="https://flowbite.com/docs/images/people/profile-picture-5.jpg" alt="user profile image"/>
              <svg
    className="w-4 h-4 text-gray-500"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Header