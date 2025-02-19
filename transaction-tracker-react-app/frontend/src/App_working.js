import { useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Dialog,
DialogActions, DialogContent, DialogTitle, Button, TablePagination, Typography,
Box, Grid, MenuItem, Select} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend,ResponsiveContainer, BarChart,XAxis,YAxis,Bar } from "recharts";
import mockResponse from './mockData'

function getRandomDate() {
  const start = new Date(2023, 0, 1);
  const end = new Date(2024, 11, 31);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toLocaleDateString("en-GB"); // Format: dd-MM-yyyy
}

const categorySubcategories = {
  "Household & Utilities": [
      "Groceries(Online/offline)",
      "Vegetables",
      "Electricity",
      "Society Maintenance",
      "Gas",
      "Internet",
      "Paper",
      "House Help",
      "Transport",
      "Service/Repairs"
    ],
  "EMI": [
      "EMI",
  ],
   "Investments": [
        "Investments",
    ],
    "Health & Personal Care": [
      "Medicial",
      "Skin Care products",
      "Doctor Visits",
      "Vaccination"
    ],
    "Education": ["Stationary", "School Activities Fees", "School fees", "Tuition fees"],
    "Food": ["Zepto","BBDaily","Zomato","Prashant Corner","Groceries(Online/offline)",
    "Restaurants/Dine In", "Vegetables"],
    "Lifestyle & Entertainment": [
      "Clothes",
      "Electronics",
      "Accessories",
      "Travel (Domestic, International)",
      "Hotel Stay",
      "Car Service",
      "Car Maintenance",
      "Bike Repairs",
      "Fuel"
    ],
    "Miscellaneous": ["Others"]
};

function ListComponent() {
  const [data, setData] = useState(mockResponse);
  const [categories, setCategories] = useState(Object.keys(categorySubcategories));
  const [filterText, setFilterText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openChartDialog, setOpenChartDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPayee, setSelectedPayee] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);


  const aggregatedData1 = Object.entries(data).reduce((acc, [payee, transactions]) => {
    const totalAmount = transactions.reduce((sum, txn) => sum + txn.amount, 0);
    acc.push({
      payee,
      totalAmount,
      transactionCount: transactions.length,
      transactions,
    });
    return acc;
  }, []);

  let smallTransactionsCount = 0;
    let smallTransactionsTotal = 0;
     let smallTransactions = [];
    const aggregatedData = Object.entries(data).reduce((acc, [payee, transactions]) => {
      const filteredTransactions = transactions.filter(txn => Math.abs(txn.amount) >= 50);
      const smallTxns = transactions.filter(txn => Math.abs(txn.amount) < 50);

      if (smallTxns.length > 0) {
        smallTransactionsCount += smallTxns.length;
        smallTransactionsTotal += smallTxns.reduce((sum, txn) => sum + txn.amount, 0);
        smallTransactions = [...smallTransactions, ...smallTxns];
      }

      if (filteredTransactions.length > 0) {
        const totalAmount = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
        acc.push({
          payee,
          totalAmount,
          transactionCount: filteredTransactions.length,
          transactions: filteredTransactions,
          category: filteredTransactions[0].category,
          subcategory: filteredTransactions[0].subcategory
        });
      }

      return acc;
    }, []);

    if (smallTransactionsCount > 0) {
      aggregatedData.push({
        payee: "Small Transactions",
        totalAmount: smallTransactionsTotal,
        transactionCount: smallTransactionsCount,
        transactions: smallTransactions
      });
    }

  const handleOpenChartDialog = () => {
    console.log("Opening chart dialog"); // Debugging
    setOpenChartDialog(true);
  }
   const handleCloseChartDialog = () => {
     setOpenChartDialog(false);
     setSelectedCategory(null);
   };

   const handleCategoryClick = (data) => {
     console.log("selected category")
     setSelectedCategory(data.name);
   };

   const tableData = Object.entries(data).flatMap(([key, values]) => values.map((item, index) => ({ ...item, payeeKey: key, index })))
     .filter(row => row.payee.toLowerCase().includes(filterText.toLowerCase()));

   const categorySums = aggregatedData.reduce((acc, row) => {
     if (!row.transactions[0].category) return acc;
     acc[row.transactions[0].category] = (acc[row.transactions[0].category] || 0) + Math.abs(row.totalAmount.toFixed(2));
     console.log("category sum " + acc[row.transactions[0].category])
     return acc;
   }, {});

   const totalAmount = Object.values(categorySums).reduce((sum, value) => sum + value, 0);
   const chartData = Object.entries(categorySums).map(([category, amount]) => ({
     name: category,
     value: amount,
     percentage: ((amount / totalAmount) * 100).toFixed(2) + "%"
   }));

   const subcategorySums = aggregatedData.reduce((acc, row) => {
     if (row.transactions[0].category === selectedCategory) {
       acc[row.transactions[0].subcategory] = (acc[row.transactions[0].subcategory] || 0) + Math.abs(row.totalAmount.toFixed(2));
     }
     return acc;
   }, {});

   const subChartData = Object.entries(subcategorySums)
     .map(([subcategory, amount]) => ({ name: subcategory, value: amount }))
     .sort((a, b) => b.value - a.value)
     .slice(0, 10);

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

  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];
  const barColors = ["#1f77b4", "#ff7f0e", "#2ca02c"]

  return (
    <Box sx={{ maxWidth: "80%", margin: "auto", padding: 3 }}>
      <Typography variant="h4" gutterBottom align="center">Transaction List</Typography>
      <Grid container spacing={2} alignItems="center" justifyContent="space-between">
        <Grid item xs={12} sm={6}>
          <TextField
            label="Filter by Payee"
            variant="outlined"
            size="small"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} textAlign="right">
          <Button variant="contained" color="secondary" onClick={handleOpenChartDialog}>
            Show Pie Chart
          </Button>
        </Grid>
      </Grid>
      <TableContainer component={Paper} sx={{ maxHeight: 500, marginTop: 2 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell><b>Payee</b></TableCell>
              <TableCell><b>Total Amount</b></TableCell>
              <TableCell><b>Transaction Count</b></TableCell>
              <TableCell><b>Category</b></TableCell>
              <TableCell><b>Sub-category</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {aggregatedData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row) => (
              <TableRow key={row.payee}>
                <TableCell>{row.payee}</TableCell>
                <TableCell>{row.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <Button onClick={() => { setSelectedPayee(row); setOpenDialog(true); }}>
                    {row.transactionCount}
                  </Button>
                </TableCell>
               <TableCell>
                  <Select
                    value={row.transactions[0].category || ""}
                    onChange={(e) => handleCategoryChange(e, row.payee)}
                    variant="outlined"
                    size="small"
                    fullWidth
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={row.transactions[0].subcategory || ""}
                    onChange={(e) => handleSubcategoryChange(e, row.payee)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!row.transactions[0].category}
                  >
                    {(categorySubcategories[row.transactions[0].category] || []).map((subcat) => (
                      <MenuItem key={subcat} value={subcat}>{subcat}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={openChartDialog} onClose={handleCloseChartDialog} maxWidth="md" fullWidth>
                  <DialogTitle>{selectedCategory ? `${selectedCategory} Breakdown` : "Category Breakdown"}</DialogTitle>
                  <DialogContent>
                   <Grid container spacing={2}>
                   <Grid item xs={6}>
                    <PieChart width={400} height={300}>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        outerRadius={120} label={(entry) => entry.percentage}
                        onClick={(data, index) => {
                           console.log("Clicked category:", data.name); // Debugging
                           handleCategoryClick(data);
                           }}>
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]}  />
                          ))}
                          animationDuration={800}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                     </Grid>
                    {selectedCategory && (
                                <Grid item xs={6}>
                                  <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={subChartData} barSize={15} barCategoryGap={5}
                                     margin={{top: 5, right: 30, left: 20, bottom: 5,}}>
                                      <XAxis dataKey="name" />
                                      <YAxis domain={[0, 'dataMax + 10']} />
                                      <Tooltip />
                                      <Bar dataKey="value"
                                        fill="#00a0fc"
                                        stroke="#000000"
                                        strokeWidth={1}>
                                        {
                                        subChartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]}  />
                                        ))
                                        }
                                        </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </Grid>
                              )}
                            </Grid>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseChartDialog} color="primary">Close</Button>
                  </DialogActions>
                </Dialog>
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Transactions for {selectedPayee?.payee}</DialogTitle>
                        <DialogContent>
                          <TableContainer component={Paper}>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableCell><b>Date</b></TableCell>
                                  <TableCell><b>Amount</b></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {selectedPayee?.transactions.map((txn, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{txn.date}</TableCell>
                                    <TableCell>{txn.amount.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </DialogContent>
                        <DialogActions>
                          <Button onClick={() => setOpenDialog(false)}>Close</Button>
                        </DialogActions>
                      </Dialog>
      <TablePagination component="div" count={aggregatedData.length} page={page} onPageChange={(event, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(event) => setRowsPerPage(parseInt(event.target.value, 10))} />
    </Box>
  );
}

export default ListComponent;
