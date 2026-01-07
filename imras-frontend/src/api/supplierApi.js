import axios from "./axios"; // ✅ keep same axios instance

// 📦 Get all suppliers (Any logged-in user)
export const fetchSuppliers = async (params = {}) => {
  try {
    const res = await axios.get("/suppliers", { params });
    console.log('🏪 Raw supplier API response:', res.data);
    
    // Handle the API response format: { suppliers: [...], totalSuppliers: n, ... }
    return {
      data: res.data.suppliers || [],
      totalSuppliers: res.data.totalSuppliers,
      totalPages: res.data.totalPages,
      currentPage: res.data.currentPage
    };
  } catch (err) {
    console.error("❌ Error fetching suppliers:", err);
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