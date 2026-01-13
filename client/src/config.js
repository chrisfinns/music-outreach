// API configuration that works in both development and production
const API_URL = import.meta.env.PROD
  ? '/api'  // In production, API is served from same domain
  : 'http://localhost:3000/api';  // In development, use localhost

export default API_URL;
