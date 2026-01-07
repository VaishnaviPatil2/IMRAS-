import { useEffect, useState, useContext, lazy, Suspense } from "react";
import { AuthContext } from "../context/AuthContext";
import AlertTable from "../components/AlertTable";
import StatCard from "../components/StatCard";
import { fetchDashboardData } from "../api/dashboardApi";

// Lazy load Chart.js components to improve initial load time
const LazyCharts = lazy(() => import("../components/LazyCharts"));

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(false);

  // Central dashboard refresh
  const refreshDashboard = async () => {
    try {
      console.log("🔄 Starting dashboard refresh...");
      setLoading(true);
      
      // Add a small delay to see loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await fetchDashboardData();
      console.log("✅ Dashboard data received:", result);
      setData(result);
      
      // Enable charts after a short delay to ensure smooth rendering
      setTimeout(() => {
        setShowCharts(true);
      }, 1000);
    } catch (err) {
      console.error("❌ Dashboard error:", err);
      
      // Better error handling
      if (err.response?.status === 401) {
        console.log("🔐 Authentication failed, redirecting to login...");
        localStorage.clear();
        window.location.href = "/login";
      } else {
        // Show error to user instead of blank screen
        setData({ error: err.message || "Failed to load dashboard" });
      }
    } finally {
      console.log("🏁 Dashboard refresh completed");
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();

    // Listen for automatic PR creation events to refresh dashboard
    const handleAutomaticPRsCreated = (event) => {
      console.log('🔄 Automatic PRs created, refreshing dashboard...', event.detail);
      refreshDashboard();
    };

    // Listen for GRN approval events to refresh dashboard
    const handleGRNApproved = (event) => {
      console.log('🔄 GRN approved, refreshing dashboard...', event.detail);
      refreshDashboard();
    };

    // Listen for PO status changes to refresh dashboard
    const handlePOStatusChanged = (event) => {
      console.log('🔄 PO status changed, refreshing dashboard...', event.detail);
      refreshDashboard();
    };

    window.addEventListener('automaticPRsCreated', handleAutomaticPRsCreated);
    window.addEventListener('grnApproved', handleGRNApproved);
    window.addEventListener('poStatusChanged', handlePOStatusChanged);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('automaticPRsCreated', handleAutomaticPRsCreated);
      window.removeEventListener('grnApproved', handleGRNApproved);
      window.removeEventListener('poStatusChanged', handlePOStatusChanged);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-slate-600 font-medium">Loading dashboard...</p>
          <p className="mt-2 text-sm text-slate-500">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  if (!data || !data.counts) {
    // Check if it's an error state
    if (data?.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Dashboard Error</h2>
            <p className="text-gray-600 mb-6">{data.error}</p>
            <button 
              onClick={refreshDashboard}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Try Again
            </button>
            <div className="mt-4 text-sm text-gray-500">
              <p>Debug info:</p>
              <p>User: {user?.role || "Unknown"}</p>
              <p>Token: {localStorage.getItem("token") ? "Present" : "Missing"}</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Dashboard Data</h2>
          <p className="text-gray-600 mb-6">Unable to load dashboard information</p>
          <button 
            onClick={refreshDashboard}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Reload Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Enhanced charts with better colors
  
  const transferOrdersChart = {
    labels: ["Pending", "Approved", "Rejected", "Completed", "Cancelled"],
    datasets: [
      {
        data: [
          data.counts.transferOrders?.pending || 0,
          data.counts.transferOrders?.approved || 0,
          data.counts.transferOrders?.rejected || 0,
          data.counts.transferOrders?.completed || 0,
          data.counts.transferOrders?.cancelled || 0,
        ],
        backgroundColor: [
          "rgba(251, 146, 60, 0.8)",  // Pending - Orange
          "rgba(37, 99, 235, 0.8)",   // Approved - Blue
          "rgba(239, 68, 68, 0.8)",   // Rejected - Red
          "rgba(34, 197, 94, 0.8)",   // Completed - Green
          "rgba(156, 163, 175, 0.8)"  // Cancelled - Gray
        ],
        borderColor: [
          "rgba(251, 146, 60, 1)",
          "rgba(37, 99, 235, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(156, 163, 175, 1)"
        ],
        borderWidth: 2,
        hoverOffset: 15,
      },
    ],
  };

  // Purchase Orders Status Chart (role-based)
  const canSeePOs = ['admin', 'manager', 'warehouse'].includes(user.role);
  const canSeeTransferOrders = ['admin', 'manager', 'warehouse'].includes(user.role);
  const canSeeStockAlerts = ['admin', 'manager', 'warehouse'].includes(user.role);
  const poStatusChart = canSeePOs ? (
    user.role === 'warehouse' ? {
      // Warehouse sees only acknowledged POs
      labels: ["Ready for GRN"],
      datasets: [
        {
          data: [
            data.counts.purchaseOrdersByStatus?.acknowledged || 0,
          ],
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)", // Acknowledged - Green
          ],
          borderColor: [
            "rgba(34, 197, 94, 1)",
          ],
          borderWidth: 2,
          hoverOffset: 15,
        },
      ],
    } : {
      // Admin/Manager see all PO statuses
      labels: ["Draft", "Sent", "Acknowledged", "Completed", "Cancelled"],
      datasets: [
        {
          data: [
            data.counts.purchaseOrdersByStatus?.draft || 0,
            data.counts.purchaseOrdersByStatus?.sent || 0,
            data.counts.purchaseOrdersByStatus?.acknowledged || 0,
            data.counts.purchaseOrdersByStatus?.completed || 0,
            data.counts.purchaseOrdersByStatus?.cancelled || 0,
          ],
          backgroundColor: [
            "rgba(156, 163, 175, 0.8)", // Draft - Gray
            "rgba(59, 130, 246, 0.8)",  // Sent - Blue
            "rgba(34, 197, 94, 0.8)",   // Acknowledged - Green
            "rgba(16, 185, 129, 0.8)",  // Completed - Teal
            "rgba(239, 68, 68, 0.8)"    // Cancelled - Red
          ],
          borderColor: [
            "rgba(156, 163, 175, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(16, 185, 129, 1)",
            "rgba(239, 68, 68, 1)"
          ],
          borderWidth: 2,
          hoverOffset: 15,
        },
      ],
    }
  ) : null;
  

  // Role-based stats - Only show relevant data per role (removed PR/PO duplicates)
  const getRoleBasedStats = () => {
    if (user.role === 'admin') {
      return [
        { title: "Total Users", value: data.counts.users || 0, color: "blue" },
        { title: "Admin Users", value: data.counts.usersByRole?.admin || 0, color: "red" },
        { title: "Manager Users", value: data.counts.usersByRole?.manager || 0, color: "blue" },
        { title: "Warehouse Users", value: data.counts.usersByRole?.warehouse || 0, color: "green" },
        { title: "Supplier Users", value: data.counts.usersByRole?.supplier || 0, color: "yellow" },
        { title: "Categories", value: data.counts.categories || 0, color: "green" },
        { title: "Items", value: data.counts.items || 0, color: "purple" },
        { title: "Warehouses", value: data.counts.warehouses || 0, color: "indigo" },
        { title: "Suppliers", value: data.counts.suppliers || 0, color: "yellow" },
        { title: "Low Stock Alerts", value: data.lowStockLocations?.length || 0, color: "red" },
        { 
          title: "Purchase Requests", 
          value: data.counts.purchaseRequests || 0, 
          color: "purple", 
          showChart: true,
          chartType: "doughnut",
          chartData: {
            labels: ["Pending", "Approved", "Converted", "Rejected"],
            datasets: [{
              data: [
                data.counts.purchaseRequestsByStatus?.pending || 0,
                data.counts.purchaseRequestsByStatus?.approved || 0,
                data.counts.purchaseRequestsByStatus?.converted_to_po || 0,
                data.counts.purchaseRequestsByStatus?.rejected || 0
              ],
              backgroundColor: ["#f59e0b", "#10b981", "#3b82f6", "#ef4444"],
              borderWidth: 0
            }],
            statusText: `${data.counts.purchaseRequestsByStatus?.pending || 0} pending, ${data.counts.purchaseRequestsByStatus?.approved || 0} approved`
          }
        },
        { 
          title: "Purchase Orders", 
          value: data.counts.purchaseOrders || 0, 
          color: "cyan", 
          showChart: true,
          chartType: "doughnut",
          chartData: {
            labels: ["Draft", "Sent", "Ack", "Done", "Cancel"],
            datasets: [{
              data: [
                data.counts.purchaseOrdersByStatus?.draft || 0,
                data.counts.purchaseOrdersByStatus?.sent || 0,
                data.counts.purchaseOrdersByStatus?.acknowledged || 0,
                data.counts.purchaseOrdersByStatus?.completed || 0,
                data.counts.purchaseOrdersByStatus?.cancelled || 0
              ],
              backgroundColor: ["#9ca3af", "#3b82f6", "#10b981", "#059669", "#ef4444"],
              borderWidth: 0
            }],
            statusText: `${data.counts.purchaseOrdersByStatus?.sent || 0} sent, ${data.counts.purchaseOrdersByStatus?.acknowledged || 0} acknowledged`
          }
        },
        { title: "Total GRNs", value: data.counts.grns || 0, color: "orange" },
      ];
    } else if (user.role === 'manager') {
      return [
        { title: "Items to Manage", value: data.counts.items || 0, color: "purple" },
        { title: "Warehouses", value: data.counts.warehouses || 0, color: "indigo" },
        { title: "Stock Locations", value: data.counts.stockLocations || 0, color: "cyan" },
        { title: "Low Stock Alerts", value: data.lowStockLocations?.length || 0, color: "red" },
        { 
          title: "Purchase Requests", 
          value: data.counts.purchaseRequests || 0, 
          color: "purple", 
          showChart: true,
          chartType: "bar",
          chartData: {
            labels: ["Pending", "Approved", "Converted"],
            datasets: [{
              data: [
                data.counts.purchaseRequestsByStatus?.pending || 0,
                data.counts.purchaseRequestsByStatus?.approved || 0,
                data.counts.purchaseRequestsByStatus?.converted_to_po || 0
              ],
              backgroundColor: ["#f59e0b", "#10b981", "#3b82f6"],
              borderWidth: 0
            }],
            statusText: `${data.counts.purchaseRequestsByStatus?.pending || 0} awaiting approval`
          }
        },
        { 
          title: "Purchase Orders", 
          value: data.counts.purchaseOrders || 0, 
          color: "cyan", 
          showChart: true,
          chartType: "doughnut",
          chartData: {
            labels: ["Draft", "Sent", "Ack", "Done", "Cancel"],
            datasets: [{
              data: [
                data.counts.purchaseOrdersByStatus?.draft || 0,
                data.counts.purchaseOrdersByStatus?.sent || 0,
                data.counts.purchaseOrdersByStatus?.acknowledged || 0,
                data.counts.purchaseOrdersByStatus?.completed || 0,
                data.counts.purchaseOrdersByStatus?.cancelled || 0
              ],
              backgroundColor: ["#9ca3af", "#3b82f6", "#10b981", "#059669", "#ef4444"],
              borderWidth: 0
            }],
            statusText: `${data.counts.purchaseOrdersByStatus?.sent || 0} with suppliers`
          }
        },
        { title: "Pending GRNs", value: data.counts.grnsByStatus?.pending || 0, color: "orange" },
        { title: "Total Suppliers", value: data.counts.suppliers || 0, color: "blue" },
      ];
    } else if (user.role === 'warehouse') {
      return [
        { title: "Stock Locations", value: data.counts.stockLocations || 0, color: "cyan" },
        { title: "Low Stock Items", value: data.lowStockLocations?.length || 0, color: "red" },
        { title: "Items in Warehouse", value: data.counts.items || 0, color: "purple" },
        { title: "Warehouses", value: data.counts.warehouses || 0, color: "indigo" },
        { title: "My GRNs Created", value: data.counts.warehouseGrns?.created || 0, color: "blue" },
        { title: "Total GRNs", value: data.counts.grns || 0, color: "orange" },
      ];
    } else if (user.role === 'supplier') {
      return [
        { 
          title: "My Purchase Orders", 
          value: data.counts.supplierPOs?.total || 0, 
          color: "blue", 
          showChart: true,
          chartType: "doughnut",
          chartData: {
            labels: ["Sent", "Acknowledged", "Completed"],
            datasets: [{
              data: [
                data.counts.supplierPOs?.sent || 0,
                data.counts.supplierPOs?.acknowledged || 0,
                data.counts.supplierPOs?.completed || 0
              ],
              backgroundColor: ["#3b82f6", "#10b981", "#059669"],
              borderWidth: 0
            }],
            statusText: `${data.counts.supplierPOs?.sent || 0} awaiting response`
          }
        },
        { title: "Pending Response", value: data.counts.supplierPOs?.sent || 0, color: "yellow" },
        { title: "Acknowledged Orders", value: data.counts.supplierPOs?.acknowledged || 0, color: "green" },
        { title: "Completed Orders", value: data.counts.supplierPOs?.completed || 0, color: "cyan" },
      ];
    }

    return [];
  };

  const stats = getRoleBasedStats();

  return (
    <div className="space-y-8">
      {/* Simple Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {user.role === 'admin' ? 'Admin Dashboard' :
               user.role === 'manager' ? 'Inventory Dashboard' :
               user.role === 'warehouse' ? 'Warehouse Dashboard' :
               'Dashboard'}
            </h1>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            color={stat.color}
            showChart={stat.showChart}
            chartType={stat.chartType}
            chartData={stat.chartData}
          />
        ))}
      </div>

      {/* Charts Section */}
      {showCharts && canSeeTransferOrders && (
        <Suspense fallback={
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                <span className="mr-3">📊</span>
                Transfer Orders Overview
              </h3>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading chart...</p>
                </div>
              </div>
            </div>
            
            {canSeePOs && (
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                  <span className="mr-3">📈</span>
                  Purchase Orders Status
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading chart...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        }>
          <LazyCharts 
            transferOrdersChart={transferOrdersChart}
            poStatusChart={poStatusChart}
            canSeePOs={canSeePOs}
          />
        </Suspense>
      )}

      {/* Alerts Section */}
      {canSeeStockAlerts && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-8">
            <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
              <span className="mr-3">🚨</span>
              Stock Alerts
              {data.lowStockLocations?.length > 0 && (
                <span className="ml-3 bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                  {data.lowStockLocations.length} items
                </span>
              )}
            </h3>
            <AlertTable
              items={data.lowStockLocations || []}
              type="lowStock"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
