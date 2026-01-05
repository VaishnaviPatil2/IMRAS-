import React from "react";

const Sidebar = ({ role = "Admin", currentTab, setCurrentTab }) => {
  // 🔹 Sankey-aligned menu
  const menu = {
    common: [{ name: "Dashboard", key: "home" }],

    Admin: [
      { name: "Inventory", key: "inventory" },
      { name: "Suppliers", key: "suppliers" },
      { name: "User Management", key: "users" },
      { name: "PR", key: "pr" },
      { name: "PO", key: "po" },
      { name: "GRN", key: "grn" },
      { name: "Reports", key: "reports" },
    ],

    Manager: [
      { name: "Inventory", key: "inventory" },
      { name: "PR", key: "pr" },
      { name: "PO", key: "po" },
      { name: "Reports", key: "reports" },
    ],

    Warehouse: [
      { name: "Inventory", key: "inventory" },
      { name: "GRN", key: "grn" },
      { name: "Reorder Alerts", key: "alerts" },
      // Optional: If warehouse staff should see POs for receiving/updates
      { name: "PO", key: "po" },
    ],

    Supplier: [
      { name: "PO", key: "po" }, // Only PO page for supplier
    ],
  };

  // Support supplier role dynamically
  const links = [...menu.common, ...(menu[role] || [])];

  const logout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = "/login";
    } catch (err) {
      console.error("❌ Logout failed:", err);
    }
  };

  return (
    <aside className="w-64 bg-[#020617] text-slate-200 flex flex-col min-h-screen border-r border-slate-800">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-blue-400">IMRAS</h1>
        <p className="text-xs text-slate-400">Inventory System</p>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-slate-800">
        <p className="text-sm font-semibold">Logged User</p>
        <p className="text-xs text-slate-300 capitalize">{role}</p>
        <button
          onClick={logout}
          className="mt-1 text-xs text-red-500 hover:underline"
        >
          Logout
        </button>
      </div>

      {/* Menu Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <button
            key={link.key}
            onClick={() => setCurrentTab(link.key)}
            className={`block w-full text-left px-4 py-2 rounded-md text-sm transition ${
              currentTab === link.key
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {link.name}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
