import React, { useState ,useEffect} from "react";
import CategorySelector from "./CategorySelector";
import { Tooltip as MuiTooltip,AppBar, Tabs, Tab, Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Checkbox,TextField, LinearProgress,IconButton,InputAdornment ,
    MenuItem, Select, FormControl} from "@mui/material";
import {TablePagination} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear"; // Import Clear Icon
import { fetchTransactionCategories } from "../../api/transactionsApi";

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
        const json = await fetchTransactionCategories();

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

console.log(aggregatedData ? Object.values(aggregatedData).flat().length : 0)

return (
        <>
        {/* 🔹 Unified Search Bar */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder="Search Payee, Category, Subcategory..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  sx={{ width: 300 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setFilterText("")} size="small">
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

        <Box>
          <TableContainer component={Paper}
            sx={{
                maxHeight: 500,
                marginTop: 2,
                borderRadius: 2,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
          >
            <Table stickyHeader sx={{ "& .MuiTableCell-root": { fontSize: "0.9rem", padding: "8px 12px" } }}>
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
                          <MenuItem value="" disabled>
                            Select Category
                          </MenuItem>
                          {categories.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                              {cat}
                            </MenuItem>
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
                          <Typography
                            noWrap
                            sx={{ fontSize: "0.85rem", fontWeight: 500 }}
                          >
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
              <TablePagination
                          component="div"
                          count={aggregatedData ? Object.values(aggregatedData).flat().length : 0}
                          page={page}
                          onPageChange={(event, newPage) => setPage(newPage)}
                          rowsPerPage={rowsPerPage}
                          onRowsPerPageChange={(event) =>
                            setRowsPerPage(parseInt(event.target.value, 10))
                          }
                        />
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={aggregatedData ? Object.values(aggregatedData).flat().length : 0}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) =>
              setRowsPerPage(parseInt(event.target.value, 10))
            }
          />
        </Box>
       </>
    );
}