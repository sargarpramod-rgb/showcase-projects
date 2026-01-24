import config from "../../config";

export const saveTransactions = async (aggregatedData) => {
  const jwt = localStorage.getItem("jwt");

  const response = await fetch(`${config.API_BASE}/api/save-transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`
    },
    body: JSON.stringify(aggregatedData, null, 2)
  });

  if (!response.ok) {
    throw new Error("Error in data save");
  }

  return response.text();
};

export const fetchTransactions = async () => {
  const jwt = localStorage.getItem("jwt");
  const response = await fetch(`${config.API_BASE}/api/transactions`, {
    headers: { "Authorization": `Bearer ${jwt}` }
  });
  if (!response.ok) throw new Error("Error fetching transactions");
  return response.json();
};