import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import BreadCrumb from './BreadCrumb'

function ProfileDropdown() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

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
      <motion.button
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.03 }}
        className="flex items-center gap-2 focus:outline-none"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <motion.img
          className="w-10 h-10 rounded-full border border-gray-200"
          src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
          alt="user profile"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 150 }}
        />
        <motion.svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg origin-top-right z-50 rounded-lg overflow-hidden"
          >
            <Link
              to="/profile"
              className="block px-4 py-3 text-gray-800 hover:bg-gray-100 transition"
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
              className="w-full text-left px-4 py-3 text-red-600 hover:bg-gray-100 transition"
              onClick={() => {
                // handle logout
              }}
            >
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Header({ activeSection }) {
  return (
    <motion.nav
      className="fixed top-0 z-50 w-full bg-white border-b border-gray-200"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="px-3 py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start rtl:justify-end">
            <Link to="/login" className="flex flex-col ms-2">
              <h1 className="text-2xl font-bold text-[#3E3F43]">POS Master.3</h1>
              <h2>Version 2.3EF</h2>
            </Link>
            <BreadCrumb activeSection={activeSection} />
          </div>
          <div className="flex items-center">
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

export default Header
