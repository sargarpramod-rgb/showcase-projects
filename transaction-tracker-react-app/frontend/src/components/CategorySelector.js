import React, { useState, useEffect } from "react";
import { MenuItem, Select, FormControl, CircularProgress } from "@mui/material";

export default function CategorySelector({
  category,
  subcategory,
  type,
  data,
  setData,
  payee,
  smallTransactions
}) {

  const [categoryJson, setCategoryJson] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [categorySubcategories, setCategorySubcategories] = useState({});

  // ====== Call API on mount ======
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/transaction-categories");
        const json = await response.json();

        setCategoryJson(json);

        // Build categories array
        setCategories(json.map((c) => c.name));

        // Build subcategory map
        const subMap = {};
        json.forEach((item) => {
          subMap[item.name] = item.subCategoryList.map((sub) => sub.name);
        });
        setCategorySubcategories(subMap);

        setLoading(false);
      } catch (error) {
        console.error("Failed to load categories:", error);
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // ====== Existing Handlers ======
  const handleCategoryChange = (event, payee) => {
    const selectedCategory = event.target.value;
    setData((prevData) => {
      const updatedData = { ...prevData };

      Object.keys(updatedData).forEach((key) => {
        const matchingTransactions = smallTransactions.some(
          (txn) => txn.payee === key && payee === "Small Transactions"
        );

        updatedData[key] = updatedData[key].map((item) =>
          item.payee === payee || matchingTransactions
            ? {
                ...item,
                category: selectedCategory,
                subcategory:
                  categorySubcategories[selectedCategory]?.[0] || ""
              }
            : item
        );
      });

      return updatedData;
    });
  };

  const handleSubcategoryChange = (event, payee) => {
    const selectedSubcategory = event.target.value;

    setData((prevData) => {
      const updatedData = { ...prevData };

      Object.keys(updatedData).forEach((key) => {
        const matchingTransactions = smallTransactions.some(
          (txn) => txn.payee === key
        );

        updatedData[key] = updatedData[key].map((item) =>
          item.payee === payee || matchingTransactions
            ? { ...item, subcategory: selectedSubcategory }
            : item
        );
      });

      return updatedData;
    });
  };

  // ===== Loading State =====
  if (loading) {
    return (
      <FormControl size="small" sx={{ width: "100%" }}>
        <CircularProgress size={20} />
      </FormControl>
    );
  }

  return (
    <FormControl size="small" sx={{ width: "100%" }}>
      {/* CATEGORY DROPDOWN */}
      {type === "category" && (
        <Select
          value={category || ""}
          onChange={(e) => handleCategoryChange(e, payee)}
          displayEmpty
        >
          <MenuItem value="" disabled>
            Select Category
          </MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </Select>
      )}

      {/* SUBCATEGORY DROPDOWN */}
      {type === "subcategory" && (
        <Select
          value={subcategory || ""}
          onChange={(e) => handleSubcategoryChange(e, payee)}
          displayEmpty
          disabled={!category}
        >
          <MenuItem value="" disabled>
            Select Subcategory
          </MenuItem>

          {(categorySubcategories[category] || []).map((subcat) => (
            <MenuItem key={subcat} value={subcat}>
              {subcat}
            </MenuItem>
          ))}
        </Select>
      )}
    </FormControl>
  );
}
