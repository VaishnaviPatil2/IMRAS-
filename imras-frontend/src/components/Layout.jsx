import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  // Debug: Check what's in the user object
  console.log("User object in Layout:", user);

  const role = user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();

  // 🔹 Updated menu with PR/PO modules and correct role-based access
  const menu = {
    common: user.role !== 'supplier' ? [{ name: "Dashboard", path: "/dashboard" }] : [], // Remove dashboard for suppliers

    Admin: [
      { name: "Item & Catalog", path: "/items" },
      { name: "Stock & Warehouse", path: "/stock-warehouse" },
      { name: "Purchase Requests", path: "/purchase-requests" },
      { name: "Purchase Orders", path: "/purchase-orders" },
      { name: "Suppliers", path: "/suppliers" },
      { name: "User Management", path: "/users" },
    ],

    Manager: [
      { name: "Item & Catalog", path: "/items" },
      { name: "Stock & Warehouse", path: "/stock-warehouse" },
      { name: "Purchase Requests", path: "/purchase-requests" },
      { name: "Purchase Orders", path: "/purchase-orders" },
      { name: "GRN", path: "/grn" },
      { name: "Suppliers", path: "/suppliers" },
    ],

    Warehouse: [
      { name: "Item & Catalog", path: "/items" },
      { name: "Stock & Warehouse", path: "/stock-warehouse" },
      { name: "Purchase Orders", path: "/purchase-orders" },
      { name: "GRN", path: "/grn" },
    ],

    Supplier: [
      { name: "My Purchase Orders", path: "/supplier-dashboard" },
    ],
  };

  // Support supplier role dynamically
  const links = [...menu.common, ...(menu[role] || [])];

  const handleLogout = () => {
    try {
      logout();
      navigate("/login");
    } catch (err) {
      console.error("❌ Logout failed:", err);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-[#020617] text-slate-200 flex flex-col border-r border-slate-800">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-800">
          <h1 className="text-xl font-bold text-blue-400">IMRAS</h1>
          <p className="text-xs text-slate-400">Inventory Management System</p>
        </div>

        {/* User Profile Section */}
        <div className="px-6 py-6 border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-2 left-2 w-16 h-16 bg-blue-500 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-2 right-2 w-12 h-12 bg-purple-500 rounded-full blur-lg animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-cyan-500 rounded-full blur-md animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-5">
              {/* Premium Avatar with Glow Effect */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                <div className="relative w-14 h-14 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl border border-blue-400/30 transform hover:scale-105 transition-transform duration-300">
                  <span className="text-white font-bold text-xl drop-shadow-lg">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Premium Status Indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-slate-800 shadow-lg animate-bounce"></div>
              </div>
              
              {/* Enhanced User Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-white font-bold text-lg truncate bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    {user.name || "User"}
                  </h3>
                  {/* Premium Verified Badge */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center w-6 h-6 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-lg shadow-lg transform hover:rotate-12 transition-transform duration-300">
                      <svg className="w-4 h-4 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Premium Role Badge */}
                <div className="mb-2">
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border transform hover:scale-105 transition-all duration-300 ${
                    user.role === 'admin' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400/50 shadow-red-500/25' :
                    user.role === 'manager' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400/50 shadow-blue-500/25' :
                    user.role === 'warehouse' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400/50 shadow-green-500/25' :
                    'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-400/50 shadow-gray-500/25'
                  }`}>
                    <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
                
                {/* Email with Icon */}
                {user.email && (
                  <div className="flex items-center space-x-2 text-xs text-slate-300">
                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate font-medium">{user.email}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Premium Status Card */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm rounded-xl p-4 mb-5 border border-slate-600/30 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <span className="text-sm font-semibold text-green-300">Active Session</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">
                    {new Date().toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Premium Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-500 hover:via-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 shadow-2xl hover:shadow-red-500/25 transform hover:-translate-y-0.5 hover:scale-[1.02] border border-red-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm tracking-wide">Logout</span>
            </button>
          </div>
        </div>

        {/* Menu Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`block w-full text-left px-4 py-2 rounded-md text-sm transition ${
                location.pathname === link.path
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 bg-slate-100 min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-lg border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-slate-800">IMRAS</h2>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;