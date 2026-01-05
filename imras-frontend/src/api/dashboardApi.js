import axios from "axios";

const API_URL = "http://localhost:5000/api/dashboard";

export const fetchDashboardData = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch dashboard" };
  }
};
