import axios from "axios";

const API_URL = "/api/dashboard";

export const fetchDashboardData = async () => {
  try {
    console.log("🔄 Starting dashboard API call...");
    
    const token = localStorage.getItem("token");
    console.log("🔑 Token:", token ? "Present" : "Missing");
    
    if (!token) {
      throw new Error("No authentication token found");
    }
    
    console.log("📡 Making request to:", API_URL);
    
    const response = await axios.get(API_URL, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    });
    
    console.log("✅ Dashboard API response received:", response.status);
    console.log("📊 Data keys:", Object.keys(response.data));
    
    return response.data;
  } catch (error) {
    console.error("❌ Dashboard API error:", error);
    
    if (error.code === 'ECONNABORTED') {
      throw { message: "Request timeout - server may be slow" };
    }
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      throw error.response.data || { message: `Server error: ${error.response.status}` };
    } else if (error.request) {
      console.error("No response received:", error.request);
      throw { message: "No response from server - check if backend is running" };
    } else {
      console.error("Request setup error:", error.message);
      throw { message: error.message || "Failed to fetch dashboard" };
    }
  }
};
