import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);
      if (response.data.name) {
        localStorage.setItem("name", response.data.name);
      }
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Login failed" };
  }
};

// User Management APIs (Admin only)
export const getAllUsers = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch users" };
  }
};

export const updateUserRole = async (userId, role) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(`${API_URL}/update-role/${userId}`, 
      { role }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update user role" };
  }
};

export const deleteUser = async (userId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.delete(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete user" };
  }
};

export const createUserByAdmin = async (userData) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_URL}/create`, userData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to create user" };
  }
};
// Validate token
export const validateToken = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");
    
    const response = await axios.get(`${API_URL}/validate`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    // If token is invalid, clear localStorage
    localStorage.clear();
    throw error.response?.data || { message: "Token validation failed" };
  }
};