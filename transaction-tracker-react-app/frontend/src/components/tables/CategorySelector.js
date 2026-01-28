import React, { useState, useEffect } from "react";
import { MenuItem, Select, FormControl, CircularProgress } from "@mui/material";

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
      Object.keys(updatedData).forEach(key => {
        const matchingTransactions = smallTransactions.some(
          txn => txn.payee === key && payee === "Small Transactions"
        );
        updatedData[key] = updatedData[key].map(item => {
          if (item.payee === payee || matchingTransactions) {
            return {
              ...item,
              category: selectedCategory,
              subcategory: showUncategorized
                               ? "" // leave blank
                               : (categorySubcategories[selectedCategory]?.[0] || "")

            };
          }
          return item;
        });
      });
      return updatedData;
    });
  };

  const handleSubcategoryChange = (event, payee) => {
    const selectedSubcategory = event.target.value;
    setData(prevData => {
      const updatedData = { ...prevData };
      Object.keys(updatedData).forEach(key => {
        const matchingTransactions = smallTransactions.some(
          txn => txn.payee === key
        );
        updatedData[key] = updatedData[key].map(item =>
          item.payee === payee || matchingTransactions
            ? { ...item, subcategory: selectedSubcategory }
            : item
        );
      });
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
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
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
            <MenuItem key={subcat} value={subcat}>{subcat}</MenuItem>
          ))}
        </Select>
      )}
    </FormControl>
  );
}