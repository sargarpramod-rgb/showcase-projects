import config from "../config/config";

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

export const fetchPreviousTransactions = async () => {
  const jwt = localStorage.getItem("jwt");
   const response = await fetch(`${config.API_BASE}/api/transactions-summary-by/2025`, {
                    method: "GET",
                    headers: {
                      "Authorization": `Bearer ${jwt}`,   // Attach JWT here
                      "Content-Type": "application/json"
                    }
                  })
  if (!response.ok) throw new Error("Error fetching transactions");
  return response.json();
};

export const fetchTransactionCategories = async () => {
  const jwt = localStorage.getItem("jwt");
  const response = await fetch(`${config.API_BASE}/api/transaction-categories`, {
           method: "GET",
           headers: {
             "Authorization": `Bearer ${jwt}`,   // Attach JWT here
             "Content-Type": "application/json"
           }
         })
  if (!response.ok) throw new Error("Error fetching transactions");
  return response.json();
};

export const uploadTransactions = async (uploadedFile) => {
  const formData = new FormData();
  formData.append("file", uploadedFile);
  const jwt = localStorage.getItem("jwt");
  console.log('config.API_BASE')
  console.log(config.API_BASE)
   const response = await fetch(`${config.API_BASE}/api/upload-transaction-file`, {
            method: "POST",
            headers: {
                                  'Authorization': `Bearer ${jwt}`
                              },
            body: formData,
          });
  if (!response.ok) throw new Error("File upload failed");
  return response.json();
};

export const saveTransactionCategories = async (categories) => {
  const jwt = localStorage.getItem("jwt");

  const response = await fetch(`${config.API_BASE}/api/transaction-categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`
    },
    body: JSON.stringify(categories)
  });

  if (!response.ok) {
    throw new Error("Error saving categories");
  }

  return response.json();
};

export const fetchSubcategories = async (category) => {
  const jwt = localStorage.getItem("jwt");

  const response = await fetch(`${config.API_BASE}/api/subcategories/${encodeURIComponent(category)}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Error fetching subcategories");
  }

  return response.json();
};

export const saveSubcategories = async (category, subcategories) => {
  const jwt = localStorage.getItem("jwt");

  const response = await fetch(`${config.API_BASE}/api/subcategories/${encodeURIComponent(category)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`
    },
    body: JSON.stringify(subcategories)
  });

  if (!response.ok) {
    throw new Error("Error saving subcategories");
  }

  return response.json();
};
