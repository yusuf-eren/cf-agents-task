// Configuration file to handle environment variables
const config = {
  // Backend URL from environment variables, fallback to localhost for development
  BACKEND_URL: import.meta.env.VITE_PUBLIC_BACKEND_URL || "http://localhost:8787",
  APP_URL: import.meta.env.VITE_PUBLIC_APP_URL || "http://localhost:3000",
};

export default config;