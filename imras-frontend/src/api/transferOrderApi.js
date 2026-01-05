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

export const transferOrderApi = {
  // Get all transfer orders with pagination and filters
  getAll: (params = {}) => api.get('/transfer-orders', { params }),
  
  // Get transfer order by ID
  getById: (id) => api.get(`/transfer-orders/${id}`),
  
  // Create new transfer order (warehouse/admin)
  create: (transferOrderData) => api.post('/transfer-orders', transferOrderData),
  
  // Update transfer order (warehouse/admin) - only for pending orders
  update: (id, transferOrderData) => api.put(`/transfer-orders/${id}`, transferOrderData),
  
  // Submit transfer order for approval (warehouse/admin) - changes draft to pending
  submit: (id) => api.patch(`/transfer-orders/${id}/submit`),
  
  // Approve/reject transfer order (manager/admin)
  approve: (id, approvalData) => api.patch(`/transfer-orders/${id}/approve`, approvalData),
  
  // Complete transfer order (warehouse/admin)
  complete: (id, completionData) => api.patch(`/transfer-orders/${id}/complete`, completionData),
  
  // Cancel transfer order
  cancel: (id, cancelData) => api.patch(`/transfer-orders/${id}/cancel`, cancelData)
};