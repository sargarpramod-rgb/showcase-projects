import React, { useState } from 'react';
import { Box, Typography, Checkbox, Button, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import CategorySelector from "./CategorySelector";

export default function UncategorizedView({ count, transactionsData, onBulkApply }) {

  const { aggregatedData, data, setData, smallTransactions } = transactionsData;
  const [selected, setSelected] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSubcategory, setBulkSubcategory] = useState('');

  const handleSelectAll = (event) => {
    console.log("aggregatedData uncategorized"+JSON.stringify(aggregatedData, null, 2))
    setSelected(event.target.checked ? aggregatedData.map(tx => tx.id) : []);
  };

  const handleApply = () => {
    setData(prevData => {
      const updatedData = { ...prevData };

      selected.forEach(payeeKey => {
        updatedData[payeeKey] = updatedData[payeeKey].map(item =>
          !item.category // only uncategorized
            ? {
                ...item,
                category: bulkCategory,
                subcategory: bulkSubcategory
              }
            : item
        );
      });

      return updatedData;
    });

    // Clear bulk selectors after apply
    setBulkCategory('');
    setBulkSubcategory('');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Uncategorized Transactions ({count})
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Checkbox
          checked={selected.length === aggregatedData.length}
          onChange={handleSelectAll}
        />

        {/* Bulk category selector */}
        <FormControl size="small">
          <CategorySelector
            category={bulkCategory}          // local state for bulk category
            subcategory={bulkSubcategory}    // local state for bulk subcategory
            payee={"Bulk"}                   // marker, not used directly
            data={data}
            setData={setData}
            smallTransactions={selected}     // pass selected rows
            type="category"
          />
        </FormControl>

        {/* Bulk subcategory selector */}
        <FormControl size="small">
          <CategorySelector
            category={bulkCategory}
            subcategory={bulkSubcategory}
            payee={"Bulk"}
            data={data}
            setData={setData}
            smallTransactions={selected}
            type="subcategory"
          />
        </FormControl>

        <Button variant="contained" onClick={handleApply}>
          Apply
        </Button>
      </Box>
    </Box>

  );
};