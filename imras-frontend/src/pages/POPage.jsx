import React, { useState, useEffect, useContext } from "react";
import {
  fetchPOs,
  approvePO,
  completePO,
  supplierResponsePO,
  delayDecisionPO,
  fetchSupplierPOs
} from "../api/poApi";
import { AuthContext } from "../context/AuthContext";


/* 🔧 Helper to format date for input field */
const formatDateForInput = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

const POPage = () => {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toLowerCase() || "admin";

  const [pos, setPOs] = useState([]);
  const [search, setSearch] = useState("");

  // 🔹 Per-PO input states
  const [delayDates, setDelayDates] = useState({});
  const [comments, setComments] = useState({});

  // 🔄 Load all POs
const loadPOs = async () => {
  try {
    let data = [];
    if (role === "supplier") {
      data = await fetchSupplierPOs();
    } else {
      data = await fetchPOs();
    }
    console.log("📌 Loaded POs:", data);
    setPOs(data);
  } catch (err) {
    console.error("❌ Error loading POs:", err);
  }
};

  useEffect(() => {
    loadPOs();
  }, []);

  /* 🔧 Populate delayDates when POs reload */
  useEffect(() => {
    const initDates = {};
    pos.forEach((po) => {
      if (po.delayRequestedDate) {
        initDates[po._id] = formatDateForInput(po.delayRequestedDate);
      }
    });
    setDelayDates((prev) => ({ ...prev, ...initDates }));
  }, [pos]);

  // ✅ Admin approve PO
  const handleApprove = async (id) => {
    try {
      await approvePO(id);
      await loadPOs();
    } catch (err) {
      console.error("❌ Error approving PO:", err);
    }
  };

  // 📦 Complete PO after GRN
  const handleComplete = async (id) => {
    try {
      await completePO(id);
      await loadPOs();
    } catch (err) {
      console.error("❌ Error completing PO:", err);
    }
  };

  // 📨 Supplier response (Accept / Reject / Delay)
  const handleSupplierAction = async (id, action) => {
    try {
      const payload = { action };

      if (action === "DELAY") {
        if (!delayDates[id]) {
          alert("Please select a new expected date");
          return;
        }
        payload.newDate = delayDates[id];
        payload.comment = comments[id] || "Delay requested";
      }

      if (action === "REJECT") {
        payload.comment = comments[id] || "Rejected by supplier";
      }

      await supplierResponsePO(id, payload);

      setDelayDates((p) => ({ ...p, [id]: "" }));
      setComments((p) => ({ ...p, [id]: "" }));

      await loadPOs();
    } catch (err) {
      console.error("❌ Error supplier action:", err);
    }
  };

  // ⏳ Delay decision (Admin / Manager)
const handleDelayDecision = async (id, decision) => {
  try {
    const managerComment = prompt("Enter comment for supplier") || "";
    await delayDecisionPO(id, decision, managerComment);
    await loadPOs();
  } catch (err) {
    console.error("❌ Error delay decision:", err);
  }
};

  // 🔍 Search filter
  const filteredPOs = pos.filter((po) => {
    const text = search.toLowerCase();
    return (
      po.pr?.product?.productName?.toLowerCase().includes(text) ||
      po.pr?.product?.sku?.toLowerCase().includes(text) ||
      po.supplier?.name?.toLowerCase().includes(text)
    );
  });

  // 🟢 Status display
 const renderStatus = (po) => (
  <div className="text-sm space-y-1">
    <div><b>Internal:</b> {po.internalStatus}</div>
    <div><b>Supplier:</b> {po.supplierStatus}</div>
    {po.supplierDelayCount > 0 && <div><b>Delays:</b> {po.supplierDelayCount}</div>}
    {po.supplierDelayReason && <div><b>Supplier Comment:</b> {po.supplierDelayReason}</div>}
    {po.managerComment && <div><b>Manager Comment:</b> {po.managerComment}</div>}
  </div>
);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Purchase Orders</h2>

      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 px-3 py-2 border rounded w-full max-w-sm"
      />

      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2">Product</th>
            <th className="border px-2">SKU</th>
            <th className="border px-2">Supplier</th>
            <th className="border px-2">Qty</th>
            <th className="border px-2">Expected</th>
            <th className="border px-2">Status</th>
            <th className="border px-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredPOs.map((po) => (
            <tr key={po._id}>
              <td className="border px-2">{po.pr?.product?.productName}</td>
              <td className="border px-2">{po.pr?.product?.sku}</td>
              <td className="border px-2">{po.supplier?.name}</td>
              <td className="border px-2">{po.quantity}</td>

              {/* 🔧 Safe date render */}
              <td className="border px-2">
                {po.expectedDeliveryDate
                  ? new Date(po.expectedDeliveryDate).toLocaleDateString()
                  : "-"}
              </td>

              <td className="border px-2">{renderStatus(po)}</td>

              <td className="border px-2 space-y-1">
                {/* Admin approve */}
                {role === "admin" && po.internalStatus === "Draft" && (
                  <button onClick={() => handleApprove(po._id)}>
                    ✅ Approve
                  </button>
                )}

                {/* Supplier actions */}
                {role === "supplier" &&
                  po.internalStatus === "SentToSupplier" &&
                  !po.supplierResponseLocked && (
                    <>
                      <button onClick={() => handleSupplierAction(po._id, "ACCEPT")}>
                        Accept
                      </button>
                      <button onClick={() => handleSupplierAction(po._id, "REJECT")}>
                        Reject
                      </button>
                       <button onClick={() => handleSupplierAction(po._id, "DELAY")}>
                        Delay
                      </button>

                      {/* Delay date input */}
                      <input
                        type="date"
                        value={delayDates[po._id] || ""}
                        onChange={(e) =>
                          setDelayDates((prev) => ({
                            ...prev,
                            [po._id]: e.target.value
                          }))
                        }
                      />

                      <input
                        type="text"
                        placeholder="Comment"
                        value={comments[po._id] || ""}
                        onChange={(e) =>
                          setComments((prev) => ({
                            ...prev,
                            [po._id]: e.target.value
                          }))
                        }
                      />

                     
                    </>
                  )}

                {/* Delay decision */}
                {(role === "manager") &&
                  po.supplierStatus === "DelayRequested" && (
                    <>
                      <button onClick={() => handleDelayDecision(po._id, "APPROVE")}>
                        Approve Delay
                      </button>
                      <button onClick={() => handleDelayDecision(po._id, "REJECT")}>
                        Reject Delay
                      </button>
                    </>
                  )}

                {/* Complete */}
                {(role === "manager") &&
                  po.internalStatus === "Active" &&
                  po.supplierStatus === "Accepted" && (
                    <button onClick={() => handleComplete(po._id)}>
                      Complete (GRN)
                    </button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default POPage;
