import React, { useState } from "react";
import { MenuItem, Select, FormControl } from "@mui/material";

const categories = ["Household & Utilities", "EMI", "Investments", "Health & Personal Care","Education","Food",
                    "Restaurants/Dine In","Lifestyle & Entertainment","Miscellaneous"];
const categorySubcategories = {
  "Household & Utilities": ["Groceries(Online/offline)","Vegetables","Utilities","Society Maintenance"
                           ,"House Help","Transport","Service/Repairs","Adhoc"],
  "EMI": ["EMI"],
  "Investments": ["Investments"],
  "Health & Personal Care": ["Medicial","Saloon","Skin Care products","Doctor Visits","Vaccination"],
  "Education": ["Stationary", "School Activities Fees", "School fees", "Tuition fees"],
  "Food": ["Zepto","BBDaily","Zomato","Prashant Corner","Restaurants/Dine In", "Vegetables/Food"],
  "Lifestyle & Entertainment": ["Clothes","Electronics","Accessories","Entertainment",
                            "Travel (Domestic, International)","Hotel Stay","Car Service",
                            "Car Maintenance","Bike Repairs","Fuel"],
  "Miscellaneous": ["Others"]
};

export default function CategorySelector({ category, subcategory, type,data, setData,payee,smallTransactions }) {

 // State for selected category and subcategory
   const [selectedCategory, setSelectedCategory] = useState("");
   const [selectedSubcategory, setSelectedSubcategory] = useState("");

  const handleCategoryChange = (event, payee) => {
    const selectedCategory = event.target.value;
    setData(prevData => {
      const updatedData = { ...prevData };
      Object.keys(updatedData).forEach((key) => {
       const matchingTransactions = smallTransactions.some(txn => {
       return txn.payee === key && "Small Transactions" === payee
       });
       console.log("key"+key)
       console.log("matchingTransactions"+matchingTransactions)
        updatedData[key] = updatedData[key].map((item) =>
          item.payee === payee || matchingTransactions? { ...item, category: selectedCategory, subcategory: categorySubcategories[selectedCategory]?.[0] || "" } : item
        );
      });
      return updatedData;
    });
  };

   const handleSubcategoryChange = (event, payee) => {
    const selectedSubcategory = event.target.value;
    setData(prevData => {
      const updatedData = { ...prevData };
      Object.keys(updatedData).forEach((key) => {
        const matchingTransactions = smallTransactions.some(txn => txn.payee === key)

        updatedData[key] = updatedData[key].map((item) =>
          item.payee === payee || matchingTransactions ? { ...item, subcategory: selectedSubcategory } : item
        );
      });
      return updatedData;
    });
  };


  return (
    <FormControl size="small" sx={{ width: "100%" }}>
      {/* Show Category Dropdown */}
      {type === "category" && (
        <Select value={category || ""} onChange={(e) => handleCategoryChange(e, payee)} displayEmpty>
          <MenuItem value="" disabled>Select Category</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </Select>
      )}

      {/* Show Subcategory Dropdown */}
      {type === "subcategory" && (
        <Select value={subcategory || ""} onChange={(e) => handleSubcategoryChange(e, payee)} displayEmpty disabled={!category}>
          <MenuItem value="" disabled>Select Subcategory</MenuItem>
          {(categorySubcategories[category] || []).map((subcat) => (
            <MenuItem key={subcat} value={subcat}>{subcat}</MenuItem>
          ))}
        </Select>
      )}
    </FormControl>
  );
}
