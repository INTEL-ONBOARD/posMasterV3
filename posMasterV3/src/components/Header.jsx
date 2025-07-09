
import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BreadCrumb from './BreadCrumb'

function ProfileDropdown() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-2 focus:outline-none"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <img
          className="w-10 h-10 rounded-full border border-gray-200"
          src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
          alt="user profile"
        />
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {/* Dropdown */}
      <div
        className={`absolute right-0 mt-2 w-48 bg-white border border-gray-200  shadow-lg transition-all duration-200 origin-top-right z-50
        ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
        `}
      >
        <Link
          to="/profile"
          className="block px-4 py-3 text-gray-800 hover:bg-gray-100 transition rounded-t-lg"
        >
          View Profile
        </Link>
        <Link
          to="/settings"
          className="block px-4 py-3 text-gray-800 hover:bg-gray-100 transition"
        >
          Settings
        </Link>
        <button
          className="w-full text-left px-4 py-3 text-red-600 hover:bg-gray-100 transition rounded-b-lg"
          onClick={() => {/* handle logout here */}}
        >
          Logout
        </button>
      </div>
    </div>
  )
}

function Header({ activeSection }) {
  return (
    <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="px-3 py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start rtl:justify-end">
            <Link to="/login" className="flex flex-col ms-2">
              <h1 className='text-2xl font-bold text-[#3E3F43]'>POS Master.3</h1>
              <h2>Version 2.3EF</h2>
            </Link>
            <BreadCrumb activeSection={activeSection} />
          </div>
          <div className="flex items-center">
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Header