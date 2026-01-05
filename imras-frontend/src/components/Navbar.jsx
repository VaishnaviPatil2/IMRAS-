import React from "react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="flex justify-between items-center bg-gray-100 p-4 shadow">
      <h1 className="font-bold text-xl">IMRAS Dashboard</h1>
      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
};

export default Navbar;
