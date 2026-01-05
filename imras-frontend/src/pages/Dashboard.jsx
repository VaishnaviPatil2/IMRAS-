import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import AlertTable from "../components/AlertTable";
import { fetchDashboardData } from "../api/dashboardApi";

// Chart.js imports
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);

  // Central dashboard refresh
  const refreshDashboard = async () => {
    try {
      const result = await fetchDashboardData();
      setData(result);
    } catch (err) {
      console.error("Dashboard error:", err);
      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  if (!data || !data.counts) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Transfer Orders Chart
  const transferOrdersChart = {
    labels: ["Pending", "Approved", "Completed"],
    datasets: [
      {
        data: [
          data.counts.transferOrders?.pending || 0,
          data.counts.transferOrders?.approved || 0,
          data.counts.transferOrders?.completed || 0,
        ],
        backgroundColor: ["#fb923c", "#2563eb", "#4f46e5"],
        hoverOffset: 10,
      },
    ],
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Users" value={data.counts.users || 0} color="blue" />
        <StatCard title="Categories" value={data.counts.categories || 0} color="green" />
        <StatCard title="Items" value={data.counts.items || 0} color="purple" />
        <StatCard title="Warehouses" value={data.counts.warehouses || 0} color="indigo" />
        <StatCard title="Stock Locations" value={data.counts.stockLocations || 0} color="cyan" />
        <StatCard title="Low Stock" value={data.lowStockLocations?.length || 0} color="red" />
      </div>

      {/* Transfer Orders Chart */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4 text-slate-700">
            Transfer Orders Overview
          </h3>
          <Doughnut data={transferOrdersChart} />
        </div>
      </div>

      {/* Alerts */}
      <div className="grid md:grid-cols-1 gap-6">
        <AlertTable
          title="Low Stock Alerts"
          items={data.lowStockLocations || []}
          type="lowStock"
        />
      </div>
    </div>
  );
};

export default Dashboard;
