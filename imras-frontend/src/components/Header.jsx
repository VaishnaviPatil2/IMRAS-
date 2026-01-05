import React from "react";

const Header = ({ currentTab }) => {
  // Map key to display name
  const pageNameMap = {
    home: "Dashboard",
    inventory: "Inventory Management",
    users: "User Management",
    pr: "Purchase Requests",
    po: "Purchase Orders",
    grn: "Goods Receipt Notes",
    reports: "Reports",
    analytics: "Analytics",
    alerts: "Reorder Alerts",
  };

  const pageName = pageNameMap[currentTab] || "Dashboard";

  return (
    <header className="flex justify-between items-center bg-white shadow px-6 py-4">
      <h1 className="text-xl font-semibold">{pageName}</h1>
      <button
        onClick={() => {
          localStorage.clear();
          window.location.href = "/login";
        }}
        className="bg-red-600 px-4 py-2 rounded text-white text-sm"
      >
        Logout
      </button>
    </header>
  );
};

export default Header;
