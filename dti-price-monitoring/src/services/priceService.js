// MongoDB Backend API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Function to Add Monitoring Data
export const addPriceData = async (data) => {
  try {
    const response = await fetch(`${API_URL}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to add data');
    console.log("✅ Data saved to MongoDB");
    return await response.json();
  } catch (e) {
    console.error("❌ Error adding document: ", e);
    throw e;
  }
};

// Function to Fetch All Data
export const getPriceData = async () => {
  try {
    const response = await fetch(`${API_URL}/prices`);
    if (!response.ok) throw new Error('Failed to fetch data');
    const data = await response.json();
    return data.map(item => ({ id: item._id, ...item }));
  } catch (e) {
    console.error("❌ Error fetching data: ", e);
    return [];
  }
};

// Function to Delete a Record
export const deletePriceData = async (id) => {
  try {
    const response = await fetch(`${API_URL}/prices/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete data');
    console.log("✅ Data deleted from MongoDB");
  } catch (e) {
    console.error("❌ Error deleting document: ", e);
    throw e;
  }
};

// Function to Update a Record
export const updatePriceData = async (id, data) => {
  try {
    const response = await fetch(`${API_URL}/prices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update data');
    console.log("✅ Data updated in MongoDB");
    return await response.json();
  } catch (e) {
    console.error("❌ Error updating document: ", e);
    throw e;
  }
};

export default { addPriceData, getPriceData, deletePriceData, updatePriceData };