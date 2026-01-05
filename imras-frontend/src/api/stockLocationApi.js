import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const stockLocationApi = {
  // Get all stock locations with pagination and filters
  getAll: (params = {}) => api.get('/stock-locations', { params }),
  
  // Get stock location by ID
  getById: (id) => api.get(`/stock-locations/${id}`),
  
  // Get low stock items
  getLowStock: () => api.get('/stock-locations/low-stock'),
  
  // Create new stock location (warehouse/admin)
  create: (stockLocationData) => api.post('/stock-locations', stockLocationData),
  
  // Update stock location (warehouse/admin)
  update: (id, stockLocationData) => api.put(`/stock-locations/${id}`, stockLocationData),
  
  // Delete stock location (admin only)
  delete: (id) => api.delete(`/stock-locations/${id}`)
};