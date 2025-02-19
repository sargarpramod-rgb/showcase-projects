import { useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Paper, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Button, TablePagination, Typography, Box, Grid, MenuItem, Select } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, XAxis, YAxis, Bar } from "recharts";

function ListComponent() {
  const [data, setData] = useState([
  { payee: "John Doe", totalAmount: 200, transactionCount: 3, category: "Food", subcategory: "Groceries" },
  { payee: "Jane Smith", totalAmount: 150, transactionCount: 2, category: "Transport", subcategory: "Taxi" },
  { payee: "Alice Brown", totalAmount: 300, transactionCount: 5, category: "Bills", subcategory: "Electricity" }
]);

  const [filterText, setFilterText] = useState({ payee: "", category: "", subcategory: "" });
  const [sortConfig, setSortConfig] = useState({ key: "payee", direction: "asc" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const filteredData = sortedData.filter(row =>
    row.payee.toLowerCase().includes(filterText.payee.toLowerCase()) &&
    row.category.toLowerCase().includes(filterText.category.toLowerCase()) &&
    row.subcategory.toLowerCase().includes(filterText.subcategory.toLowerCase())
  );

  return (
    <Box sx={{ maxWidth: "80%", margin: "auto", padding: 3 }}>
      <Typography variant="h4" gutterBottom align="center">Transaction Summary</Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 500, marginTop: 2 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {[
                { key: "payee", label: "Payee" },
                { key: "totalAmount", label: "Total Amount" },
                { key: "transactionCount", label: "Transaction Count" },
                { key: "category", label: "Category" },
                { key: "subcategory", label: "Sub-category" }
              ].map(({ key, label }) => (
                <TableCell key={key}>
                  <TableSortLabel
                    active={sortConfig.key === key}
                    direction={sortConfig.key === key ? sortConfig.direction : "asc"}
                    onClick={() => handleSort(key)}
                  >
                    <b>{label}</b>
                  </TableSortLabel>
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder={`Search ${label}`}
                    onChange={(e) => setFilterText(prev => ({ ...prev, [key]: e.target.value }))}
                    fullWidth
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row) => (
              <TableRow key={row.payee}>
                <TableCell>{row.payee}</TableCell>
                <TableCell>{row.totalAmount.toFixed(2)}</TableCell>
                <TableCell>{row.transactionCount}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.subcategory}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredData.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => setRowsPerPage(parseInt(event.target.value, 10))}
      />
    </Box>
  );
}

export default ListComponent;
