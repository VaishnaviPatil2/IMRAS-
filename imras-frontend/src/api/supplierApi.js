import axios from "./axios"; // ✅ keep same axios instance

// 📦 Get all suppliers (Any logged-in user)
export const fetchSuppliers = async (params = {}) => {
  try {
    const res = await axios.get("/suppliers", { params });
    // Handle the API response format: { suppliers: [...], totalSuppliers: n, ... }
    return {
      data: res.data.suppliers || res.data || [],
      totalSuppliers: res.data.totalSuppliers,
      totalPages: res.data.totalPages,
      currentPage: res.data.currentPage
    };
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    throw err?.response?.data || err;
  }
};

// ➕ Add supplier (Admin only)
export const createSupplier = async (data) => {
  try {
    const res = await axios.post("/suppliers/add", data);
    return res.data;
  } catch (err) {
    console.error("Error creating supplier:", err);
    throw err?.response?.data || err;
  }
};

// ✏️ Update supplier (Admin only)
export const updateSupplier = async (id, data) => {
  try {
    const res = await axios.put(`/suppliers/update/${id}`, data);
    return res.data;
  } catch (err) {
    console.error("Error updating supplier:", err);
    throw err?.response?.data || err;
  }
};

// 🗑 Delete supplier (Admin only)
export const deleteSupplier = async (id) => {
  try {
    const res = await axios.delete(`/suppliers/delete/${id}`);
    return res.data;
  } catch (err) {
    console.error("Error deleting supplier:", err);
    throw err?.response?.data || err;
  }
};

// 📋 Get single supplier
export const getSupplier = async (id) => {
  try {
    const res = await axios.get(`/suppliers/${id}`);
    return res.data;
  } catch (err) {
    console.error("Error fetching supplier:", err);
    throw err?.response?.data || err;
  }
};

// 🔑 Reset supplier password (Admin only)
export const resetSupplierPassword = async (id) => {
  try {
    console.log('API: Resetting password for supplier ID:', id); // Debug log
    const res = await axios.post(`/suppliers/reset-password/${id}`);
    console.log('API: Reset password response:', res.data); // Debug log
    return res.data;
  } catch (err) {
    console.error("API: Error resetting supplier password:", err); // Debug log
    console.error("API: Error response:", err?.response?.data); // Debug log
    console.error("API: Error status:", err?.response?.status); // Debug log
    throw err?.response?.data || err;
  }
};

// 🧪 Test supplier API (Admin only)
export const testSupplierApi = async (id) => {
  try {
    console.log('API: Testing supplier API for ID:', id);
    console.log('API: Making request to:', `/suppliers/test/${id}`);
    
    const res = await axios.get(`/suppliers/test/${id}`);
    console.log('API: Test response status:', res.status);
    console.log('API: Test response data:', res.data);
    return res.data;
  } catch (err) {
    console.error("API: Test error - Full error object:", err);
    console.error("API: Error response:", err?.response);
    console.error("API: Error request:", err?.request);
    console.error("API: Error message:", err?.message);
    
    if (err.response) {
      // Server responded with error status
      console.error("API: Server error - Status:", err.response.status);
      console.error("API: Server error - Data:", err.response.data);
      throw err.response.data || { error: `Server error: ${err.response.status}` };
    } else if (err.request) {
      // Request was made but no response received
      console.error("API: Network error - No response received");
      throw { error: "Network error: No response from server" };
    } else {
      // Something else happened
      console.error("API: Request setup error:", err.message);
      throw { error: `Request error: ${err.message}` };
    }
  }
};

// 🧪 Ping test (No auth required)
export const pingSupplierApi = async () => {
  try {
    console.log('API: Pinging supplier API...');
    const res = await axios.get('/suppliers/ping');
    console.log('API: Ping response:', res.data);
    return res.data;
  } catch (err) {
    console.error("API: Ping error:", err);
    if (err.response) {
      throw err.response.data || { error: `Server error: ${err.response.status}` };
    } else if (err.request) {
      throw { error: "Network error: Cannot reach server" };
    } else {
      throw { error: `Request error: ${err.message}` };
    }
  }
};

// 🔍 Diagnose supplier data consistency (Admin only)
export const diagnoseSupplierData = async () => {
  try {
    console.log('API: Diagnosing supplier data...');
    const res = await axios.get('/suppliers/diagnose');
    console.log('API: Diagnose response:', res.data);
    return res.data;
  } catch (err) {
    console.error("API: Diagnose error:", err);
    if (err.response) {
      throw err.response.data || { error: `Server error: ${err.response.status}` };
    } else if (err.request) {
      throw { error: "Network error: Cannot reach server" };
    } else {
      throw { error: `Request error: ${err.message}` };
    }
  }
};

// 🧹 Clean up supplier data inconsistencies (Admin only)
export const cleanupSupplierData = async () => {
  try {
    console.log('API: Cleaning up supplier data...');
    const res = await axios.post('/suppliers/cleanup');
    console.log('API: Cleanup response:', res.data);
    return res.data;
  } catch (err) {
    console.error("API: Cleanup error:", err);
    if (err.response) {
      throw err.response.data || { error: `Server error: ${err.response.status}` };
    } else if (err.request) {
      throw { error: "Network error: Cannot reach server" };
    } else {
      throw { error: `Request error: ${err.message}` };
    }
  }
};

// 🔧 Fix admin user (Emergency - no auth required)
export const fixAdminUser = async () => {
  try {
    console.log('API: Fixing admin user...');
    const res = await axios.post('/suppliers/fix-admin');
    console.log('API: Fix admin response:', res.data);
    return res.data;
  } catch (err) {
    console.error("API: Fix admin error:", err);
    if (err.response) {
      throw err.response.data || { error: `Server error: ${err.response.status}` };
    } else if (err.request) {
      throw { error: "Network error: Cannot reach server" };
    } else {
      throw { error: `Request error: ${err.message}` };
    }
  }
};