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

export const categoryApi = {
  // Get all categories
  getAll: (params = {}) => api.get('/categories', { params }),
  
  // Get category by ID
  getById: (id) => api.get(`/categories/${id}`),
  
  // Create new category (admin only)
  create: (categoryData) => api.post('/categories', categoryData),
  
  // Update category (admin only)
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  
  // Delete category (admin only)
  delete: (id) => api.delete(`/categories/${id}`)
};