import React from "react";
import { MenuItem, Select, FormControl } from "@mui/material";

export default function CategorySelector({
  category,
  subcategory,
  type,
  data,
  setData,
  payee,
  smallTransactions,
  categories = [],                // default to empty array
  categorySubcategories = {},    // default to empty object
  showUncategorized

}) {
  const handleCategoryChange = (event, payee) => {
    const selectedCategory = event.target.value;
    setData(prevData => {
      const updatedData = { ...prevData };
      if (Array.isArray(updatedData.transactions)) {
        updatedData.transactions = updatedData.transactions.map(item => {
          const matchingTransactions = smallTransactions.some(
            txn => txn.payee === item.payee && payee === "Small Transactions"
          );
          if (item.payee === payee || matchingTransactions) {
            return {
              ...item,
              category: selectedCategory,
              subcategory: showUncategorized
                               ? null // leave blank
                               : (categorySubcategories[selectedCategory]?.[0]?.id ?? null)

            };
          }
          return item;
        });
      }
      return updatedData;
    });
  };

  const handleSubcategoryChange = (event, payee) => {
    const selectedSubcategory = event.target.value;
    setData(prevData => {
      const updatedData = { ...prevData };
      if (Array.isArray(updatedData.transactions)) {
        updatedData.transactions = updatedData.transactions.map(item => {
          const matchingTransactions = smallTransactions.some(
            txn => txn.payee === item.payee
          );
          return item.payee === payee || matchingTransactions
            ? { ...item, subcategory: selectedSubcategory }
            : item;
        });
      }
      return updatedData;
    });
  };

  return (
    <FormControl size="small" sx={{ width: "100%" }}>
      {type === "category" && (
        <Select
          value={category || ""}
          onChange={e => handleCategoryChange(e, payee)}
          displayEmpty
        >
          <MenuItem value="" disabled>Select Category</MenuItem>
          {categories.map(cat => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </Select>
      )}

      {type === "subcategory" && (
        <Select
          value={subcategory || ""}
          onChange={e => handleSubcategoryChange(e, payee)}
          displayEmpty
          disabled={!category}
        >
          <MenuItem value="" disabled>Select Subcategory</MenuItem>
          {(categorySubcategories[category] || []).map(subcat => (
            <MenuItem key={subcat.id} value={subcat.id}>
              {subcat.name}
            </MenuItem>
          ))}
        </Select>
      )}
    </FormControl>
  );
}