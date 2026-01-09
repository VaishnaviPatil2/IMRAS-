import axios from "./axios"; // axios instance

// Get all POs
export const fetchPOs = async () => {
  try {
    const res = await axios.get("/po");
    return res.data;
  } catch (err) {
    console.error("Error fetching POs:", err);
    throw err;
  }
};

// Create PO from PR
export const createPO = async (prId) => {
  try {
    const res = await axios.post("/po", { prId });
    return res.data;
  } catch (err) {
    console.error("Error creating PO:", err);
    throw err;
  }
};

// Admin approves PO
export const approvePO = async (id) => {
  try {
    const res = await axios.patch(`/po/${id}/approve`);
    return res.data;
  } catch (err) {
    console.error("Error approving PO:", err);
    throw err;
  }
};

// Supplier response
export const supplierResponsePO = async (id, payload) => {
  try {
    const res = await axios.patch(`/po/${id}/supplier-response`, payload);
    return res.data;
  } catch (err) {
    console.error("Error updating supplier response:", err);
    throw err;
  }
};

// Complete PO
export const completePO = async (id) => {
  try {
    const res = await axios.patch(`/po/${id}/complete`);
    return res.data;
  } catch (err) {
    console.error("Error completing PO:", err);
    throw err;
  }
};

// Admin delay decision
export const delayDecisionPO = async (id, decision, newDate = null) => {
  try {
    const payload = { decision };
    if (newDate) {
      payload.newDate = newDate;
    }
    const res = await axios.patch(`/po/${id}/delay-decision`, payload);
    return res.data;
  } catch (err) {
    console.error("Error in delay decision:", err);
    throw err;
  }
};
// Get supplier-specific POs
export const fetchSupplierPOs = async () => {
  try {
    const token = localStorage.getItem("token"); 
    const res = await axios.get("/po/supplier", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error("Error fetching supplier POs:", err);
    throw err;
  }
};
