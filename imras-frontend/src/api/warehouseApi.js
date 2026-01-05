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

export const warehouseApi = {
  // Get all warehouses
  getAll: (params = {}) => api.get('/warehouses', { params }),
  
  // Get warehouse by ID
  getById: (id) => api.get(`/warehouses/${id}`),
  
  // Create new warehouse (admin only)
  create: (warehouseData) => api.post('/warehouses', warehouseData),
  
  // Update warehouse (admin only)
  update: (id, warehouseData) => api.put(`/warehouses/${id}`, warehouseData),
  
  // Delete warehouse (admin only)
  delete: (id) => api.delete(`/warehouses/${id}`)
};