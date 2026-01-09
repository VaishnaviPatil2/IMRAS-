import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const role = user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();

  const menu = {
    common: user.role !== 'supplier' ? [{ name: "Dashboard", path: "/dashboard" }] : [],
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

  const links = [...menu.common, ...(menu[role] || [])];

  const handleLogout = () => {
    try {
      logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile Responsive */}
      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static fixed inset-y-0 left-0 z-50
        w-64 bg-slate-800 text-white flex flex-col transition-transform duration-300 ease-in-out
      `}>
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="text-xl font-bold text-blue-400">IMRAS</h1>
          <p className="text-xs text-slate-400">Inventory Management System</p>
        </div>

        <div className="px-6 py-6 border-b border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">
                {(user.name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {user.name || "User"}
              </h3>
              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block w-full text-left px-4 py-2 rounded text-sm transition ${
                location.pathname === link.path
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-100 min-h-screen lg:ml-0 w-full overflow-x-auto">
        <header className="bg-white shadow px-4 lg:px-6 py-4 flex items-center justify-between">
          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">IMRAS</h2>
          
          {/* Spacer for mobile layout balance */}
          <div className="lg:hidden w-10"></div>
        </header>

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Export the component
export { Layout as default };