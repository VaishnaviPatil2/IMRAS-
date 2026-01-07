import React, { useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, AuthContext } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import ItemCatalog from "./pages/ItemCatalog";
import StockWarehouse from "./pages/StockWarehouse";
import SupplierPage from "./pages/SupplierPage";
import SupplierDashboard from "./pages/SupplierDashboard";
import PurchaseRequest from "./pages/PurchaseRequest";
import PurchaseOrder from "./pages/PurchaseOrder";
import GRN from "./pages/GRN";

// Layout wrapper for consistent sidebar/header
import Layout from "./components/Layout";

// Component to handle supplier route based on user role
const SupplierRouteHandler = () => {
  const { user } = useContext(AuthContext);
  
  // If user is supplier, show supplier dashboard
  if (user?.role === 'supplier') {
    return <SupplierDashboard />;
  }
  
  // Otherwise show admin supplier management page
  return <SupplierPage />;
};

// Component to handle dashboard route based on user role
const DashboardRouteHandler = () => {
  const { user } = useContext(AuthContext);
  
  // If user is supplier, redirect to supplier dashboard
  if (user?.role === 'supplier') {
    return <Navigate to="/suppliers" replace />;
  }
  
  // Otherwise show main dashboard
  return <Dashboard />;
};

// Purchase Request Page Component
const PurchaseRequestPage = () => {
  return <PurchaseRequest />;
};

// Purchase Order Page Component  
const PurchaseOrderPage = () => {
  return <PurchaseOrder />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardRouteHandler />
                </Layout>
              </ProtectedRoute>
            }
          />



          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-8">
                    <h2 className="text-xl font-semibold text-gray-600">Inventory Module</h2>
                    <p className="text-gray-500 mt-2">This module has been temporarily disabled.</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <Layout>
                  <SupplierRouteHandler />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/items"
            element={
              <ProtectedRoute>
                <Layout>
                  <ItemCatalog />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/stock-warehouse"
            element={
              <ProtectedRoute>
                <Layout>
                  <StockWarehouse />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchase-requests"
            element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseRequestPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseOrderPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/supplier-dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <SupplierDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Legacy routes for backward compatibility */}
          <Route
            path="/pr"
            element={<Navigate to="/purchase-requests" replace />}
          />

          <Route
            path="/po"
            element={<Navigate to="/purchase-orders" replace />}
          />

          <Route
            path="/grn"
            element={
              <ProtectedRoute allowedRoles={['manager', 'warehouse']}>
                <Layout>
                  <GRN />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-8">
                    <h2 className="text-xl font-semibold text-gray-600">Reports Module</h2>
                    <p className="text-gray-500 mt-2">This module has been temporarily disabled.</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Default routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;