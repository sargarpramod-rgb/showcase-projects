import React, { useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Typography, Button, TextField, InputAdornment,
  IconButton, FormControl, Select, MenuItem, Box
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import MuiTooltip from "@mui/material/Tooltip";

export default function TransactionsTable({
  aggregatedData,
  categories,
  categorySubcategories,
  showUncategorized,
  selected,
  handleSelectAll,
  handleSelect,
  handleBulkApply,
  bulkCategory,
  setBulkCategory,
  bulkSubcategory,
  setBulkSubcategory,
  page,
  rowsPerPage,
  setSelectedPayee,
  setOpenDialog,
  data,
  setData,
  smallTransactions
}) {
  const [globalSearch, setGlobalSearch] = useState("");

  // 🔹 Unified filtering logic
  const filteredData = aggregatedData.filter(row =>
    row.payee.toLowerCase().includes(globalSearch.toLowerCase()) ||
    row.transactions[0].category.toLowerCase().includes(globalSearch.toLowerCase()) ||
    row.transactions[0].subcategory.toLowerCase().includes(globalSearch.toLowerCase())
  );

  return (
    <>
      {/* 🔹 Unified Search Bar */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Search Payee, Category, Subcategory..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setGlobalSearch("")} size="small">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 500,
          marginTop: 2,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}
      >
        <Table stickyHeader>
          <TableHead sx={{ backgroundColor: "#f9fafb" }}>
            <TableRow>
              {showUncategorized && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.length === aggregatedData.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 600 }}>Payee</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Total Amount</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Transaction Count</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Sub-category</TableCell>
            </TableRow>

            {/* Bulk apply row */}
            {showUncategorized && (
              <TableRow sx={{ backgroundColor: "#f1f5f9" }}>
                <TableCell padding="checkbox" />
                <TableCell colSpan={2}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Bulk Apply to Selected
                  </Typography>
                </TableCell>
                <TableCell padding="checkbox" />
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={bulkCategory}
                      onChange={(e) => {
                        setBulkCategory(e.target.value);
                        const subs = categorySubcategories[e.target.value] || [];
                        setBulkSubcategory(subs[0] || "");
                      }}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>Select Category</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth disabled={!bulkCategory}>
                    <Select
                      value={bulkSubcategory}
                      onChange={(e) => setBulkSubcategory(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>Select Subcategory</MenuItem>
                      {(categorySubcategories[bulkCategory] || []).map((subcat) => (
                        <MenuItem key={subcat} value={subcat}>{subcat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    disabled={!bulkCategory || !bulkSubcategory || selected.length === 0}
                    onClick={handleBulkApply}
                  >
                    Apply
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableHead>

          <TableBody>
            {filteredData
              .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
              .map((row) => (
                <TableRow
                  key={row.payee}
                  hover
                  sx={{
                    "&:hover": { backgroundColor: "#f3f4f6" },
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  {showUncategorized && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(row.payee)}
                        onChange={() => handleSelect(row.payee)}
                      />
                    </TableCell>
                  )}

                  <TableCell sx={{ maxWidth: 150 }}>
                    <MuiTooltip title={row.payeeFullName} arrow>
                      <Typography noWrap sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                        {row.payee}
                      </Typography>
                    </MuiTooltip>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        color: row.totalAmount > 0 ? "success.main" : "error.main",
                        fontWeight: 600
                      }}
                    >
                      {row.totalAmount > 0
                        ? `+₹${row.totalAmount.toFixed(2)}`
                        : `-₹${Math.abs(row.totalAmount.toFixed(2))}`}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setSelectedPayee(row);
                        setOpenDialog(true);
                      }}
                    >
                      {row.transactionCount}
                    </Button>
                  </TableCell>

                  <TableCell>
                    {/* CategorySelector component here */}
                  </TableCell>

                  <TableCell>
                    {/* SubcategorySelector component here */}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}