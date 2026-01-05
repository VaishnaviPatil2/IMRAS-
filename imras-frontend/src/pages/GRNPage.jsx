import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { fetchGRNs, createGRN } from "../api/grnApi";
import { fetchPOs } from "../api/poApi";
import { AuthContext } from "../context/AuthContext";

const GRNPage = () => {
  const { user } = useContext(AuthContext); // role & user info
  const role = user?.role?.toLowerCase() || "warehouse";

  const [grns, setGRNs] = useState([]);
  const [pos, setPOs] = useState([]);
  const [form, setForm] = useState({
    poId: "",
    receivedQuantity: 0,
    batchNumber: "",
    expiryDate: ""
  });

  const loadGRNs = async () => {
    try {
      const data = await fetchGRNs();
      setGRNs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPOs = async () => {
    try {
      const data = await fetchPOs();
      setPOs(data.filter(po => po.status === "Approved"));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadGRNs();
    loadPOs();
  }, []);

  const handleCreate = async () => {
    if (!form.poId || Number(form.receivedQuantity) <= 0) {
      alert("Select PO and enter valid quantity");
      return;
    }

    try {
      const payload = {
        po: form.poId,
        product: pos.find(po => po._id === form.poId)?.pr.product._id,
        quantityReceived: Number(form.receivedQuantity),
        batchNumber: form.batchNumber,
        expiryDate: form.expiryDate || null,
        receivedBy: user._id
      };

      await createGRN(payload);
      setForm({ poId: "", receivedQuantity: 0, batchNumber: "", expiryDate: "" });
      loadGRNs();
      loadPOs();
      alert("GRN Created Successfully");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to create GRN");
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">GRN (Goods Received)</h2>

          {/* Form */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <select
              value={form.poId}
              onChange={(e) => setForm({ ...form, poId: e.target.value })}
              className="border p-2 rounded"
            >
              <option value="">Select Approved PO</option>
              {pos.map(po => (
                <option key={po._id} value={po._id}>
                  {po.pr.product.productName} ({po.pr.quantityRequested})
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Quantity Received"
              value={form.receivedQuantity}
              onChange={(e) => setForm({ ...form, receivedQuantity: parseInt(e.target.value) || 0 })}
              className="border p-2 rounded"
            />

            <input
              type="text"
              placeholder="Batch Number"
              value={form.batchNumber}
              onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
              className="border p-2 rounded"
            />

            <input
              type="date"
              placeholder="Expiry Date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className="border p-2 rounded"
            />

            {/* Only Warehouse Staff / Inventory Manager can create GRN */}
            {role === "warehouse" || role === "manager" ? (
              <button
                className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
                onClick={handleCreate}
              >
                Create GRN
              </button>
            ) : null}
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-2 py-1">PO Product</th>
                <th className="border px-2 py-1">Quantity Received</th>
                <th className="border px-2 py-1">Batch</th>
                <th className="border px-2 py-1">Expiry</th>
                <th className="border px-2 py-1">Received By</th>
              </tr>
            </thead>
            <tbody>
              {grns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">No GRNs found</td>
                </tr>
              ) : (
                grns.map(grn => (
                  <tr key={grn._id}>
                    <td className="border px-2 py-1">{grn.product.productName}</td>
                    <td className="border px-2 py-1">{grn.quantityReceived}</td>
                    <td className="border px-2 py-1">{grn.batchNumber || "-"}</td>
                    <td className="border px-2 py-1">
                      {grn.expiryDate ? new Date(grn.expiryDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="border px-2 py-1">{grn.receivedBy.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GRNPage;
