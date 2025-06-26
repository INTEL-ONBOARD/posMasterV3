import React, { useState,useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
//barcode generate and printing imports
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import ToastContext from "./toasts/ToastService";

function Login() {
  const navigate = useNavigate();
   const toast = useContext(ToastContext); 
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      // Handle login logic here
       toast.open("Logged in successfully!");
      navigate("/dashboard");
    }, 2000);
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-white overflow-hidden flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">
              <span className="font-bold" style={{ color: "#00489A" }}>
                POS
              </span>
              <span className="text-gray-900"> MASTER</span>
              <span className="text-gray-700">.3</span>
            </h1>
          </div>

          <div className="text-center mb-8">
            <p className=" text-sm leading-relaxed" style={{ color: "#C8C8C8" }}>
              Welcome back! Please enter your credentials to access your account
              and access your dashboard, personalized settings, and Extreme
              features.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: "#D3D3D3" }}
              >
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-[38px] pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-[#949494]"
                  style={{ backgroundColor: "#F8F8F8" }}
                  placeholder="myemail@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "#D3D3D3" }}
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full h-[38px] pl-10 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                  style={{ backgroundColor: "#F8F8F8" }}
                  placeholder="••••••••••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: "#00489A" }}
              className="w-full h-[38px] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00489A] focus:border-transparent transition-all duration-200 text-white font-semibold flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm  mb-2"style={{ color: "#D3D3D3" }}>Trouble in login?</p>
            <button className=" text-sm font-medium hover:underline transition-colors"
            style={{ color: "#555555" }}>
              Contact our Support team
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs "style={{ color: "#D3D3D3" }}>
            Copyright © 2025 SLTC ® | VER.2025E.001R
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
