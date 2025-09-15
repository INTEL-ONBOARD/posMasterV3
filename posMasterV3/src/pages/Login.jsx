import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import ToastContext from "./toasts/ToastService";
import { apiClient } from "../api/client";


const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 1.0, ease: "easeOut" },
  },
};

const cardVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 50, damping: 18 },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

function Login() {
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiClient.post("api/users/login", {
        email: formData.email,
        password: formData.password
      });

      if (response.data.status === "success") {
        // Store user data in localStorage
        // if (response.data.data.email && response.data.data._id) {
        //   window.electronAPI.sendUserData(response.data.data.email, response.data.data._id);
        // }
        //window.electronAPI.sendUserData("user@example.com", "token123");
        //console.log("Renderer: sent user data");
        navigate("/dashboard");
      } else {
        toast.open(`${response.data.message}`, 4000, 'Login Failed', 'warning');
      }
    } catch (error) {
      // Handle different error types
      if (error.response) {
        // Server responded with error status (4xx/5xx)
        // toast.open(`Login error: ${error.response.data.message || "Unknown server error"}`);
        toast.open(`${error.response.data.message}`, 4000, 'Login Error', 'error');
      } else if (error.request) {
        // No response received
        toast.open("Network error: Please check your connection", 4000, 'Login Failed', 'warning');
      } else {
        // Other errors
        toast.open("Login error: Please try again", 4000, 'Login Failed', 'warning');
      }
    } finally {
      setIsLoading(false);  // Ensure loading state is reset
    }
  };

  return (
    <motion.div
      className="fixed inset-0 min-h-screen bg-white overflow-hidden flex items-center justify-center p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="w-full max-w-md flex flex-col justify-center min-h-[60vh]" variants={cardVariants} initial="hidden" animate="visible">
        <div>
          <motion.div
            className="bg-white rounded-2xl p-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Title */}
            <motion.div className="text-center mb-8" variants={fadeUp}>
              <h1 className="text-3xl font-bold">
                <span className="font-bold text-[#00489A]">POS</span>
                <span className="text-gray-900"> MASTER</span>
                <span className="text-gray-700">.3</span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.div className="text-center mb-8" variants={fadeUp}>
              <p className="text-sm leading-relaxed text-[#C8C8C8]">
                Welcome back! Enter your credentials to continue to your dashboard.
              </p>
            </motion.div>

            {/* Login Form */}
            <motion.form onSubmit={handleSubmit} className="space-y-6 w-full" variants={staggerContainer}>
              {/* Email Field */}
              <motion.div className="space-y-2" variants={fadeUp}>
                <label htmlFor="email" className="block text-sm font-medium text-[#D3D3D3]">
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
                    className="w-full h-[38px] pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-gray-900 placeholder-[#949494]"
                    style={{ backgroundColor: "#F8F8F8" }}
                    placeholder="Enter your email or username"
                    required
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div className="space-y-2" variants={fadeUp}>
                <label htmlFor="password" className="block text-sm font-medium text-[#D3D3D3]">
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
                    className="w-full h-[38px] pl-10 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                    style={{ backgroundColor: "#F8F8F8" }}
                    placeholder="Enter your password"
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
              </motion.div>

              {/* Login Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 180 }}
                style={{ backgroundColor: "#00489A" }}
                className="w-full h-[38px] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00489A] transition duration-200 text-white font-semibold flex items-center justify-center"
                variants={fadeUp}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Logging in...
                  </div>
                ) : (
                  "Login"
                )}
              </motion.button>
            </motion.form>

            {/* Support Section */}
            <motion.div className="mt-8 text-center" variants={fadeUp}>
              <p className="text-sm mb-2 text-[#D3D3D3]">Trouble in login?</p>
              <button
                className="text-sm font-medium hover:underline transition-colors"
                style={{ color: "#555555" }}
              >
                Contact our Support team
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/*bottom Footer section*/}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.7 }}
        >
          <p className="text-xs text-[#D3D3D3]">
            Copyright © 2025 SLTC ®  |  .{import.meta.env.VITE_VERSION_NUMBER}
          </p>
        </motion.div>


      </motion.div>
    </motion.div>
  );
}

export default Login;

// Basic usage
//open('Operation completed');

// With custom title and status
//open('File upload failed', 5000, 'Upload Error', 'error');

// All parameters
//open('Please check your inputs', 3000, 'Validation Warning', 'warning');
