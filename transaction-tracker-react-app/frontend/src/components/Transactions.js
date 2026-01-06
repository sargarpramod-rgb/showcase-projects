import React, { useState ,useEffect} from "react";
import CategorySelector from "./CategorySelector";
import { Tooltip as MuiTooltip,AppBar, Tabs, Tab, Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Checkbox,TextField, LinearProgress,IconButton,InputAdornment ,
    MenuItem, Select, FormControl} from "@mui/material";
import {TablePagination} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear"; // Import Clear Icon
import config from "../config";

export default function Transactions({ filters, transactionsData, modalHandlers }) {

      const { filterText, setFilterText,showUncategorized } = filters;
      const { aggregatedData, data, setData, smallTransactions } = transactionsData;
      const { setSelectedPayee, setOpenDialog } = modalHandlers;
      const [page, setPage] = useState(0);
      const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSubcategory, setBulkSubcategory] = useState('');
const [categories, setCategories] = useState([]);
  const [categorySubcategories, setCategorySubcategories] = useState({});
 const [categoryJson, setCategoryJson] = useState([]);
  const [loading, setLoading] = useState(true);


  // ====== Call API on mount ======
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${config.API_BASE}/api/transaction-categories`);
        const json = await response.json();

        setCategoryJson(json);

        // Build categories array
        setCategories(json.map((c) => c.categoryName));

        // Build subcategory map
        const subMap = {};
          json.forEach((item) => {
            subMap[item.categoryName] = item.subCategories;
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
// Toggle all rows
const handleSelectAll = (event) => {
  if (event.target.checked) {
    // Select all payees currently in aggregatedData
    const allPayees = aggregatedData.map((row) => row.payee);
    setSelected(allPayees);
  } else {
    // Clear all selections
    setSelected([]);
  }
};

// Toggle a single row
const handleSelect = (payee) => {
  setSelected((prevSelected) => {
    if (prevSelected.includes(payee)) {
      // If already selected, remove it
      return prevSelected.filter((p) => p !== payee);
    } else {
      // Otherwise, add it
      return [...prevSelected, payee];
    }
  });
};
const handleBulkApply = () => {
  setData(prevData => {
    const updatedData = { ...prevData };
    console.log("Selected:", selected);
    console.log("Keys in updatedData:", Object.keys(updatedData));

    selected.forEach(payeeKey => {
      if (Array.isArray(updatedData[payeeKey])) {
        updatedData[payeeKey] = updatedData[payeeKey].map(item =>
          !item.category
            ? { ...item, category: bulkCategory, subcategory: bulkSubcategory }
            : item
        );
      }
    });

    return updatedData;
  });

  setBulkCategory('');
  setBulkSubcategory('');
  setSelected([]); // optional: clear selection
};

return (
        <Box>
          <TableContainer component={Paper} sx={{ maxHeight: 500, marginTop: 2 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {showUncategorized && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.length === aggregatedData.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                  )}

                  {[
                                              { key: "payee", label: "Payee" },
                                              { key: "totalAmount", label: "Total Amount" },
                                              { key: "transactionCount", label: "Transaction Count" },
                                              { key: "category", label: "Category" },
                                              { key: "subcategory", label: "Sub-category" }
                                            ].map(({ key, label }) => (
                                              <TableCell key={key}>
                                                {key !== "totalAmount" && key !== "transactionCount" ? ( <TextField
                                                  size="small"
                                                  variant="outlined"
                                                  placeholder={`Search ${label}`}
                                                  onChange={(e) => setFilterText(prev => ({ ...prev, [key]: e.target.value }))}
                                                  value={filterText[key]}
                                                  fullWidth
                                                  InputProps={{
                                                                endAdornment: (
                                                                  <InputAdornment position="end">
                                                                    <IconButton  onClick={(e) => setFilterText(prev => ({ ...prev, [key]: "" }))} size="small">
                                                                      <ClearIcon />
                                                                    </IconButton>
                                                                  </InputAdornment>
                                                                ),
                                                              }}

                                                />) : null}
                                              </TableCell>
                                            ))}
                </TableRow>

                {/* Bulk apply row */}
                {showUncategorized && (
                  <TableRow>
                    <TableCell padding="checkbox" /> {/* empty for alignment */}
                    <TableCell colSpan={2}>
                      <Typography variant="body2">Bulk Apply to Selected</Typography>
                    </TableCell>
                    <TableCell padding="checkbox" />
                    {/* Bulk Category Select */}
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={bulkCategory}
                          onChange={(e) => {
                            setBulkCategory(e.target.value);
                            // auto-pick first subcategory if available
                            const subs = categorySubcategories[e.target.value] || [];
                            setBulkSubcategory(subs[0] || '');
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

                    {/* Bulk Subcategory Select */}
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
                {aggregatedData
                  .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                  .map((row) => (
                    <TableRow key={row.payee}>
                      {showUncategorized && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected.includes(row.payee)}
                            onChange={() => handleSelect(row.payee)}
                          />
                        </TableCell>
                      )}

                      <TableCell>
                        <MuiTooltip title={row.payeeFullName} arrow>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px", display: "inline-block" }}>
                            {row.payee}
                          </span>
                        </MuiTooltip>
                      </TableCell>

                      <TableCell>
                        <Typography
                          style={{
                            color: row.totalAmount > 0 ? "green" : "#ff6666",
                            fontFamily: "'Poppins', sans-serif",
                            letterSpacing: "0.5px"
                          }}
                        >
                          {row.totalAmount > 0
                            ? `+₹${row.totalAmount.toFixed(2)}`
                            : `-₹${Math.abs(row.totalAmount.toFixed(2))}`}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Button onClick={() => { setSelectedPayee(row); setOpenDialog(true); }}>
                          {row.transactionCount}
                        </Button>
                      </TableCell>

                      <TableCell>
                        <CategorySelector
                          category={row.transactions[0].category}
                          payee={row.payee}
                          data={data}
                          setData={setData}
                          smallTransactions={smallTransactions}
                          type="category"
                          size="small"
                          categories={categories}
                          categorySubcategories={categorySubcategories}
                          showUncategorized={showUncategorized}
                        />
                      </TableCell>

                      <TableCell>
                        <CategorySelector
                          category={row.transactions[0].category}
                          subcategory={row.transactions[0].subcategory}
                          payee={row.payee}
                          data={data}
                          setData={setData}
                          smallTransactions={smallTransactions}
                          type="subcategory"
                          size="small"
                          categories={categories}
                          categorySubcategories={categorySubcategories}
                          showUncategorized={showUncategorized}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={aggregatedData.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) =>
              setRowsPerPage(parseInt(event.target.value, 10))
            }
          />
        </Box>
    );
}