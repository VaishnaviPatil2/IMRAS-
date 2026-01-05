import axios from "./axios";

// Get all GRNs
export const fetchGRNs = async () => {
  try {
    const res = await axios.get("/grn");
    return res.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// Create GRN
export const createGRN = async (data) => {
  try {
    const res = await axios.post("/grn", data);
    return res.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// Get single GRN
export const fetchGRNById = async (id) => {
  try {
    const res = await axios.get(`/grn/${id}`);
    return res.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
