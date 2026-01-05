import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { fetchPRs, createPR, editPR, deletePR } from "../api/prApi";
import { fetchInventory } from "../api/inventoryApi";
import { fetchSuppliers } from "../api/supplierApi";
import axios from "axios";

const PRPage = ({ onPRChange }) => {
  const { user } = useContext(AuthContext);

  const role = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : "";

  const [prs, setPRs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    productId: "",
    supplierId: "",
    quantityRequested: "",
  });

  // Load PRs, Inventory, Suppliers
  useEffect(() => {
    loadPRs();
    loadInventory();
    loadSuppliers();
  }, []);

  const loadPRs = async () => {
    try {
      const res = await fetchPRs();
      setPRs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const res = await fetchInventory();
      setInventory(res);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await fetchSuppliers();
      setSuppliers(res);
    } catch (err) {
      console.error(err);
    }
  };

  // CREATE / EDIT PR
  const handleSubmitPR = async () => {
    if (!formData.productId || !formData.supplierId || !formData.quantityRequested) {
      alert("Please fill all fields");
      return;
    }

    try {
      if (editData) {
        await editPR(editData._id, formData);
        alert("PR Updated Successfully");
      } else {
        await createPR(formData);
        alert("PR Created Successfully");
      }

      setShowModal(false);
      setEditData(null);
      setFormData({ productId: "", supplierId: "", quantityRequested: "" });
      await loadPRs();
      onPRChange && onPRChange();
    } catch (err) {
      console.error(err);
      alert("Failed to save PR");
    }
  };

  const handleEditPR = (pr) => {
    setEditData(pr);
    setFormData({
      productId: pr.product._id,
      supplierId: pr.supplier._id,
      quantityRequested: pr.quantityRequested,
    });
    setShowModal(true);
  };

  const handleDeletePR = async (prId) => {
    if (!window.confirm("Are you sure to delete this PR?")) return;

    try {
      await deletePR(prId);
      await loadPRs();
      alert("PR Deleted Successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to delete PR");
    }
  };

  // CREATE PO (convert PR)
  const handleCreatePO = async (prId) => {
    const pr = prs.find((p) => p._id === prId);
    if (pr.status === "Converted") {
      alert("PO already created for this PR");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/po",
        { prId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("PO Draft Created");

      // Update PR status in frontend immediately (real-time)
      setPRs((prev) =>
        prev.map((p) => (p._id === prId ? { ...p, status: "Converted" } : p))
      );

      onPRChange && onPRChange();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to create PO");
    }
  };

  if (loading) return <div className="p-6">Loading PRs...</div>;

  // Filter PRs based on search input
  const filteredPRs = prs.filter((pr) =>
    (pr.product?.productName || "").toLowerCase().includes(search.toLowerCase()) ||
    (pr.product?.sku || "").toLowerCase().includes(search.toLowerCase()) ||
    (pr.supplier?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (pr.requestedBy?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">Purchase Requests</h2>
        {role === "Manager" && (
          <button
            onClick={() => { setShowModal(true); setEditData(null); }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium shadow"
          >
            Create PR
          </button>
        )}
      </div>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search PRs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 px-3 py-2 border rounded w-full max-w-sm"
      />

      <table className="min-w-full bg-white border rounded shadow-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Product</th>
            <th className="border px-4 py-2">SKU</th>
            <th className="border px-4 py-2">Supplier</th>
            <th className="border px-4 py-2">Qty</th>
            <th className="border px-4 py-2">Requested By</th>
            <th className="border px-4 py-2">Status</th>
            {role === "Manager" && <th className="border px-4 py-2">Actions</th>}
          </tr>
        </thead>

        <tbody>
          {filteredPRs.map((pr) => (
            <tr key={pr._id} className="hover:bg-gray-50">
              <td className="border px-4 py-2">{pr.product?.productName}</td>
              <td className="border px-4 py-2">{pr.product?.sku}</td>
              <td className="border px-4 py-2">{pr.supplier?.name}</td>
              <td className="border px-4 py-2">{pr.quantityRequested}</td>
              <td className="border px-4 py-2">{pr.requestedBy?.name}</td>
              <td className="border px-4 py-2 font-semibold">{pr.status}</td>

              {role === "Manager" && (
                <td className="border px-4 py-2 flex gap-2">
                  <button
                    onClick={() => pr.status !== "Converted" && handleEditPR(pr)}
                    className={`px-3 py-1 rounded text-white font-medium ${
                      pr.status === "Converted"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-yellow-500 hover:bg-yellow-600"
                    }`}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => pr.status !== "Converted" && handleDeletePR(pr._id)}
                    className={`px-3 py-1 rounded text-white font-medium ${
                      pr.status === "Converted"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => handleCreatePO(pr._id)}
                    className={`px-3 py-1 rounded text-white font-medium ${
                      pr.status === "Converted"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    Create PO
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* CREATE / EDIT PR MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editData ? "Edit PR" : "Create PR"}
            </h3>

            <select
              className="w-full mb-2 border px-3 py-2 rounded"
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            >
              <option value="">Select Product</option>
              {inventory.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.productName} ({item.sku})
                </option>
              ))}
            </select>

            <select
              className="w-full mb-2 border px-3 py-2 rounded"
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Quantity"
              className="w-full mb-4 border px-3 py-2 rounded"
              value={formData.quantityRequested}
              onChange={(e) =>
                setFormData({ ...formData, quantityRequested: e.target.value })
              }
            />

            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => { setShowModal(false); setEditData(null); }}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                onClick={handleSubmitPR}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PRPage;
