import React, { useState } from 'react';
import { Box, Typography, Checkbox, Button, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

export default function UncategorizedView({ count, transactions, onBulkApply }) {
  const [selected, setSelected] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSubCategory, setBulkSubCategory] = useState('');

  const handleSelectAll = (event) => {
    setSelected(event.target.checked ? transactions.map(tx => tx.id) : []);
  };

  const handleApply = () => {
    if (bulkCategory && bulkSubCategory && selected.length > 0) {
      onBulkApply(selected, bulkCategory, bulkSubCategory);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Uncategorized Transactions ({count})
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Checkbox checked={selected.length === transactions.length} onChange={handleSelectAll} />
        <FormControl size="small">
          <InputLabel>Category</InputLabel>
          <Select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
            <MenuItem value="Lifestyle">Lifestyle</MenuItem>
            <MenuItem value="Investments">Investments</MenuItem>
            <MenuItem value="Bills">Bills</MenuItem>
            {/* Add more categories as needed */}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Sub-category</InputLabel>
          <Select value={bulkSubCategory} onChange={(e) => setBulkSubCategory(e.target.value)}>
            <MenuItem value="Clothes">Clothes</MenuItem>
            <MenuItem value="Mutual Funds">Mutual Funds</MenuItem>
            <MenuItem value="Electricity">Electricity</MenuItem>
            {/* Add more sub-categories as needed */}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleApply}>Apply</Button>
      </Box>
    </Box>
  );
};