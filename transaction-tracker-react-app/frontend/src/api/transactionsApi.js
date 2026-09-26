import { backendFetch } from "./backendFetch";

// Shared fetch wrapper — cookies sent automatically via credentials: "include"
const apiFetch = async (url, options = {}) => {
  const isFormData = options.body instanceof FormData;

  const response = await backendFetch(url, {
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

export const saveTransactions = async (uploadId, aggregatedData) => {
  const response = await apiFetch("/api/transactions/save", {
    method: "POST",
    body: JSON.stringify({ uploadId, aggregatedData }, null, 2),
  });
  return response.text();
};

export const fetchPreviousTransactions = async (year) => {
  const response = await apiFetch(`/api/transactions-summary-by/${year}`);
  return response.json();
};

export const fetchTransactionCategories = async () => {
  const response = await apiFetch("/api/transaction-categories");
  return response.json();
};

export const uploadTransactions = async (uploadedFile) => {
  const formData = new FormData();
  formData.append("file", uploadedFile);

  const response = await apiFetch("/api/transactions/upload", {
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

export const sendChatQuery = async (query) => {
  try {
    const response = await fetch("http://localhost:8000/api/ai/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      if (response.status === 503 || response.status === 502) {
        throw new Error("SERVICE_UNAVAILABLE");
      }
      throw new Error(`HTTP_ERROR_${response.status}`);
    }

    return response.json();
  } catch (err) {
    // Handle network errors
    if (err.message === "Failed to fetch") {
      throw new Error("SERVICE_UNAVAILABLE");
    }
    // Re-throw if it's our custom error
    if (err.message.startsWith("SERVICE_UNAVAILABLE") || err.message.startsWith("HTTP_ERROR")) {
      throw err;
    }
    // Other errors
    throw new Error("SERVICE_ERROR");
  }
};

export const fetchMonthlyTrends = async (year, options = {}) => {
  const response = await apiFetch(`/api/transactions-trend/monthly/${year}`, options);
  return response.json();
};

export const fetchYearlyTrends = async (options = {}) => {
  const response = await apiFetch("/api/transactions-trend/yearly", options);
  return response.json();
};

export const fetchCategoryTrends = async (year, options = {}) => {
  const response = await apiFetch(`/api/transactions-trend/categories/${year}`, options);
  return response.json();
};
