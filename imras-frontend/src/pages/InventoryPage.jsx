import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  fetchInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../api/inventoryApi";

const InventoryPage = ({ onInventoryChange }) => {
  const { user } = useContext(AuthContext);
  const role = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : "";

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    productName: "",
    quantity: "",
    reorderLevel: "",
    safetyStock: "",
    supplierEmail: "",
  });

  const loadInventory = async () => {
    try {
      const res = await fetchInventory();
      setItems(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      productName: "",
      quantity: "",
      reorderLevel: "",
      safetyStock: "",
      supplierEmail: "",
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      productName: item.productName,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel,
      safetyStock: item.safetyStock || "",
      supplierEmail: item.supplierEmail || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        reorderLevel: Number(formData.reorderLevel),
        safetyStock: Number(formData.safetyStock || 0),
      };

      if (editingItem) {
        const res = await updateInventoryItem(editingItem._id, payload);
        alert("Item updated successfully");
        setItems(prev => prev.map(i => i._id === editingItem._id ? res.item : i));
      } else {
        const res = await addInventoryItem(payload);
        alert("Item added successfully");
        setItems(prev => [...prev, res.item]);
      }

      setShowModal(false);
      onInventoryChange && onInventoryChange();
    } catch (err) {
      console.error(err);
      alert("Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteInventoryItem(id);
      await loadInventory();
      onInventoryChange && onInventoryChange();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const filteredItems = items.filter(item =>
    item.productName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-6">Loading Inventory...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Inventory Items</h2>
        {role === "Admin" && (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={openAddModal}
          >
            Add Item
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 px-3 py-2 border rounded w-full max-w-sm"
      />

      <table className="min-w-full bg-white border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border">Name</th>
            <th className="py-2 px-4 border">Qty</th>
            <th className="py-2 px-4 border">Reorder + Safety Stock</th>
            {role === "Admin" && <th className="py-2 px-4 border">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item._id}>
              <td className="py-2 px-4 border">{item.productName}</td>
              <td className="py-2 px-4 border">{item.quantity}</td>
              <td className="py-2 px-4 border">{item.reorderLevel + (item.safetyStock || 0)}</td>
              {role === "Admin" && (
                <td className="py-2 px-4 border">
                  <button className="text-blue-600 mr-3" onClick={() => openEditModal(item)}>Edit</button>
                  <button className="text-red-600" onClick={() => handleDelete(item._id)}>Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="text-lg font-semibold mb-4">{editingItem ? "Edit Item" : "Add Item"}</h3>

            <input
              placeholder="Product Name"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full mb-2 px-3 py-2 border rounded"
            />

            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full mb-2 px-3 py-2 border rounded"
            />

            <input
              type="number"
              placeholder="Reorder Level"
              value={formData.reorderLevel}
              onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              className="w-full mb-2 px-3 py-2 border rounded"
            />

            <input
              type="number"
              placeholder="Safety Stock"
              value={formData.safetyStock}
              onChange={(e) => setFormData({ ...formData, safetyStock: e.target.value })}
              className="w-full mb-2 px-3 py-2 border rounded"
            />

            <input
              type="email"
              placeholder="Email for Reorder Alerts"
              value={formData.supplierEmail}
              onChange={(e) => setFormData({ ...formData, supplierEmail: e.target.value })}
              className="w-full mb-3 px-3 py-2 border rounded"
            />

            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSubmit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
