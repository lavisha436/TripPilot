import axios from 'axios';

/**
 * 🌐 Centralized Axios Instance for TripPilot API Requests.
 * Configured with environment-based base URL and automatic HTTP-Only cookie credentials.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true
});

export default api;
