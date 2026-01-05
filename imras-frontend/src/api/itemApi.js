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

export const itemApi = {
  // Get all items with pagination and filters
  getAll: (params = {}) => api.get('/items', { params }),
  
  // Get item by ID
  getById: (id) => api.get(`/items/${id}`),
  
  // Create new item (admin only)
  create: (itemData) => api.post('/items', itemData),
  
  // Update item (admin only)
  update: (id, itemData) => api.put(`/items/${id}`, itemData),
  
  // Delete item (admin only)
  delete: (id) => api.delete(`/items/${id}`)
};