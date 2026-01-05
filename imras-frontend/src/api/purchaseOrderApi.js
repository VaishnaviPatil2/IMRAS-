import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with auth token
const createAuthAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

// Get all purchase orders (Admin/Manager)
export const fetchAllPurchaseOrders = async (filters = {}) => {
  try {
    const api = createAuthAxios();
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.supplierId) params.append('supplierId', filters.supplierId);
    
    const response = await api.get(`/purchase-orders/all?${params}`);
    return response.data;
  } catch (error) {
    console.error('Fetch all purchase orders error:', error);
    throw error.response?.data || { error: 'Failed to fetch purchase orders' };
  }
};

// Get supplier's purchase orders
export const fetchSupplierPurchaseOrders = async (filters = {}) => {
  try {
    const api = createAuthAxios();
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    
    const response = await api.get(`/purchase-orders/supplier/my-orders?${params}`);
    return response.data;
  } catch (error) {
    console.error('Fetch supplier purchase orders error:', error);
    throw error.response?.data || { error: 'Failed to fetch purchase orders' };
  }
};

// Get single purchase order by ID
export const fetchPurchaseOrderById = async (id) => {
  try {
    const api = createAuthAxios();
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error('Fetch purchase order by ID error:', error);
    throw error.response?.data || { error: 'Failed to fetch purchase order' };
  }
};

// Supplier responds to purchase order
export const respondToPurchaseOrder = async (id, responseData) => {
  try {
    const api = createAuthAxios();
    const response = await api.put(`/purchase-orders/supplier/respond/${id}`, responseData);
    return response.data;
  } catch (error) {
    console.error('Respond to purchase order error:', error);
    throw error.response?.data || { error: 'Failed to respond to purchase order' };
  }
};