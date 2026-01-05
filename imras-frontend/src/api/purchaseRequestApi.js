import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with auth token
const createAuthAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });
};

export const purchaseRequestApi = {
  // Get all purchase requests
  getAll: async (params = {}) => {
    const api = createAuthAxios();
    const response = await api.get('/purchase-requests', { params });
    return response.data;
  },

  // Create new purchase request
  create: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/purchase-requests', data);
    return response.data;
  },

  // Update purchase request status (approve/reject)
  updateStatus: async (id, data) => {
    const api = createAuthAxios();
    const response = await api.put(`/purchase-requests/${id}/status`, data);
    return response.data;
  },

  // Create PO from PR (Manager's "Create PO" button)
  createPOFromPR: async (id) => {
    const api = createAuthAxios();
    const response = await api.post(`/purchase-requests/${id}/create-po`);
    return response.data;
  },

  // Edit purchase request
  edit: async (id, data) => {
    const api = createAuthAxios();
    const response = await api.put(`/purchase-requests/${id}`, data);
    return response.data;
  },

  // Delete purchase request
  delete: async (id, reason) => {
    const api = createAuthAxios();
    const response = await api.delete(`/purchase-requests/${id}`, { 
      data: { reason } 
    });
    return response.data;
  },

  // Trigger automatic PO generation
  triggerAutoGeneration: async () => {
    const api = createAuthAxios();
    const response = await api.post('/purchase-requests/auto-generate');
    return response.data;
  },

  // Get low stock summary
  getLowStockSummary: async () => {
    const api = createAuthAxios();
    const response = await api.get('/purchase-requests/low-stock-summary');
    return response.data;
  }
};