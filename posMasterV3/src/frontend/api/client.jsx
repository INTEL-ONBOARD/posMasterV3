import axios from "axios";

export const apiClient = axios.create({
  baseURL: "https://posmasterv3-backend.onrender.com", // Uses the config value
  timeout: 10000,
});