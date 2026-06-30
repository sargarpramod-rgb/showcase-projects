import config from "../config/config";

// Shared fetch wrapper — cookies sent automatically via credentials: "include"
const apiFetch = async (url, options = {}) => {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${config.API_BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      // Skip Content-Type for FormData — browser sets multipart/form-data + boundary automatically
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`);
  }

  return response;
};

export const saveTransactions = async (aggregatedData) => {
  const response = await apiFetch("/api/save-transactions", {
    method: "POST",
    body: JSON.stringify(aggregatedData, null, 2),
  });
  return response.text();
};

export const fetchPreviousTransactions = async () => {
  const response = await apiFetch("/api/transactions-summary-by/2025");
  return response.json();
};

export const fetchTransactionCategories = async () => {
  const response = await apiFetch("/api/transaction-categories");
  return response.json();
};

export const uploadTransactions = async (uploadedFile) => {
  const formData = new FormData();
  formData.append("file", uploadedFile);

  const response = await apiFetch("/api/upload-transaction-file", {
    method: "POST",
    body: formData,  // apiFetch auto-detects FormData and skips Content-Type
  });
  return response.json();
};


export const saveTransactionCategories = async (categories) => {
  const response = await apiFetch("/api/transaction-categories", {
    method: "POST",
    body: JSON.stringify(categories),
  });
  return response.json();
};

export const fetchSubcategories = async (category) => {
  const response = await apiFetch(`/api/subcategories/${encodeURIComponent(category)}`);
  return response.json();
};

export const saveSubcategories = async (category, subcategories) => {
  const response = await apiFetch(`/api/subcategories/${encodeURIComponent(category)}`, {
    method: "POST",
    body: JSON.stringify(subcategories),
  });
  return response.json();
};