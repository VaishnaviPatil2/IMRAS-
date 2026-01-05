import axios from "./axios";

// Fetch all inventory
export const fetchInventory = async () => {
  try {
    const res = await axios.get("/inventory");
    return res.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// Add inventory
export const addInventoryItem = async (item) => {
  try {
    const res = await axios.post("/inventory/add", {
      productName: item.productName,
      quantity: Number(item.quantity),
      reorderLevel: Number(item.reorderLevel),
      safetyStock: Number(item.safetyStock),
      supplierEmail: item.supplierEmail
    });
    return res.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// Update inventory
export const updateInventoryItem = async (id, item) => {
  try {
    const res = await axios.put(`/inventory/update/${id}`, {
      productName: item.productName,
      quantity: Number(item.quantity),
      reorderLevel: Number(item.reorderLevel),
      safetyStock: Number(item.safetyStock),
      supplierEmail: item.supplierEmail
    });
    return res.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// Delete inventory
export const deleteInventoryItem = async (id) => {
  try {
    const res = await axios.delete(`/inventory/delete/${id}`);
    return res.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
