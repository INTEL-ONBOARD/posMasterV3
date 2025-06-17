import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';

function Desktop2() {
  const [formData, setFormData] = useState({
    email: 'myemail@example.com',
    password: '••••••••'
  });
  const [errors, setErrors] = useState({
    email: 'Email username or email is required',
    password: 'Enter password is required'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">
              <span className="text-blue-600">POS</span>
              <span className="text-gray-900"> MASTER</span>
              <span className="text-gray-700">.3</span>
            </h1>
          </div>

          {/* Welcome Message */}
          <div className="text-center mb-8">
            <p className="text-gray-500 text-sm leading-relaxed">
              Welcome back! Please enter your credentials to access your account and access your dashboard, personalized settings, and Extreme features.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email/Username Field */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email or Username
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2.5 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400`}
                  placeholder="myemail@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2.5 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Login
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button className="text-blue-600 hover:text-blue-700 text-sm hover:underline transition-colors">
              Contact our Support team
            </button>
          </div>
        </div>

        {/* Additional Info Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            © 2025 POS Master. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Desktop2;