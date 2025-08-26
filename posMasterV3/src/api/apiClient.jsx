// src/api/apiClient.ts
import axios from "axios";

const apiClient = axios.create({
    baseURL: "https://posmasterv3-backend.onrender.com", // Uses the config value
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});


// apiClient.interceptors.request.use((config) => {
//     const token = localStorage.getItem("access_token");
//     if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
// });

export default apiClient;
