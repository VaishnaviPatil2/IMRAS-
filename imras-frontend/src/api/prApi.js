import axios from "./axios";

// GET all PRs
export const fetchPRs = async () => {
  try {
    const res = await axios.get("/pr");
    return res.data;
  } catch (err) {
    console.error("Error fetching PRs:", err);
    throw err;
  }
};

// CREATE PR
export const createPR = async ({ productId, supplierId, quantityRequested }) => {
  if (!productId || !supplierId || !quantityRequested)
    throw new Error("Missing PR details");

  try {
    const res = await axios.post("/pr", { productId, supplierId, quantityRequested: Number(quantityRequested) });
    return res.data;
  } catch (err) {
    console.error("Error creating PR:", err);
    throw err;
  }
};

// EDIT PR
export const editPR = async (id, { productId, supplierId, quantityRequested }) => {
  try {
    const res = await axios.patch(`/pr/${id}`, { productId, supplierId, quantityRequested });
    return res.data;
  } catch (err) {
    console.error("Error editing PR:", err);
    throw err;
  }
};

// DELETE PR
export const deletePR = async (id) => {
  try {
    const res = await axios.delete(`/pr/${id}`);
    return res.data;
  } catch (err) {
    console.error("Error deleting PR:", err);
    throw err;
  }
};
