import React, { useState } from "react";
import { Tooltip as MuiTooltip,AppBar, Tabs, Tab, Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, LinearProgress,IconButton,InputAdornment  } from "@mui/material";
import { styled } from "@mui/system";
import { CheckCircle, UploadFile, Edit, Save } from "@mui/icons-material";
import { Dialog,DialogActions, DialogContent, DialogTitle, TablePagination, Grid, MenuItem, Select} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend,ResponsiveContainer, BarChart,XAxis,YAxis,Bar } from "recharts";
import mockResponse from './mockData'
import { useDropzone } from 'react-dropzone';
import ClearIcon from "@mui/icons-material/Clear"; // Import Clear Icon
import CategorySelector from "./components/CategorySelector";

// Custom Styled Tabs
const CustomTabs = styled(Tabs)({
  backgroundColor: "#f5f5f5",
  borderRadius: "10px 10px 0 0",
  width: "85%", // Adjusted width to 85% of the screen
  margin: "auto",
  "& .MuiTabs-indicator": {
    display: "none",
  },
});

// Custom Styled Tab
const CustomTab = styled(Tab)(({ selected }) => ({
  fontWeight: "bold",
  textTransform: "none",
  borderRadius: "10px 10px 0 0",
  backgroundColor: selected ? "#ffffff" : "#d1d1d1",
  boxShadow: selected ? "0px -3px 6px rgba(0,0,0,0.2)" : "none",
  transition: "all 0.3s",
  "&:hover": {
    backgroundColor: selected ? "#fff" : "#e0e0e0",
  },
}));


export default function MultiStepFormWithStyledTabs() {
  const [tabIndex, setTabIndex] = useState(0);
  const [file, setFile] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

    const [data, setData] = useState(mockResponse);
    const [filterText, setFilterText] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [openChartDialog, setOpenChartDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPayee, setSelectedPayee] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);

    if (uploadedFile) {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      try {
        const response = await fetch("http://localhost:8080/api/upload-transaction-file", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("File upload failed");
        }

        const result = await response.json();
        setData(result)
        console.log("File uploaded successfully:", result);
        setTabIndex(1);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
  };

  const handleChange = (id, key, value) => {
    setData(data.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const handleSave = async (event) => {

    try {
            const response = await fetch("http://localhost:8080/api/save-transactions", {
              method: "POST",
               headers: {
                      'Content-Type': 'application/json',
                  },
              body:  JSON.stringify(aggregatedData, null, 2)
            });
                console.log("aggregatedData" + JSON.stringify(aggregatedData, null, 2))
            if (!response.ok) {
              throw new Error("Error in data save");
            }

            const result = await response;
            console.log("Data saved successfully:", result);
            setIsSaved(true);
            setTabIndex(2); // Move to Step 3 after saving
          } catch (error) {
            console.error("Error saving the data:", error);
          }
  };

  const progressValue = tabIndex === 0 ? 33 : tabIndex === 1 ? 66 : 100;

  console.log("filtertext = " +filterText)


  let smallTransactionsCount = 0;
    let smallTransactionsTotal = 0;
     let smallTransactions = [];
     const normalizedFilterPayee = filterText?.payee?.trim().toLowerCase() ?? "";
             const normalizedFilterCategory = filterText?.category?.trim().toLowerCase() ?? "";
             const normalizedFilterSubCategory = filterText?.subcategory?.trim().toLowerCase() ?? "";

     const isPayeeSet = normalizedFilterPayee && normalizedFilterPayee.trim() !== "";
     const isCategorySet = normalizedFilterCategory && normalizedFilterCategory.trim() !== "";
     const isSubCategorySet = normalizedFilterSubCategory && normalizedFilterSubCategory.trim() !== "";
    let aggregatedData = Object.entries(data).reduce((acc, [payee, transactions]) => {

      const filteredTransactions = transactions.filter(txn => Math.abs(txn.amount) >= 50)


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
          payeeFullName : filteredTransactions[0].payeeFullName,
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

    aggregatedData = aggregatedData.filter(txn => !isPayeeSet || txn.payee?.trim().toLowerCase().includes(normalizedFilterPayee))
                            .filter(txn => !isCategorySet || (txn.category?.trim().toLowerCase().includes(normalizedFilterCategory)
                                                     && txn.category !== "undefined"))
                             .filter(txn => !isSubCategorySet || (txn.subcategory?.trim().toLowerCase().includes(normalizedFilterSubCategory)
                                                                              && txn.subcategory !== "undefined"))


    console.log("aggregatedData"+JSON.stringify(aggregatedData, null, 2))

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

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const sortTransactions = (data, sortKey, ascending = true) => {
      if (!data || typeof data !== "object") return {}; // Handle invalid data

      return Object.keys(data).reduce((sortedData, date) => {
        sortedData[date] = [...data[date]].sort((a, b) => {
          if (typeof a[sortKey] === "string") {
            return ascending
              ? a[sortKey].localeCompare(b[sortKey])
              : b[sortKey].localeCompare(a[sortKey]);
          } else {
            return ascending
              ? a[sortKey] - b[sortKey]
              : b[sortKey] - a[sortKey];
          }
        });
        return sortedData;
      }, {});
    };

  const handleSort = (key) => {
      let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
        }
        console.log(key)
        console.log(direction)
        setSortConfig({ key, direction });

        // Sort using the computed direction
        const sortedData = sortTransactions(data, key, direction === 'asc');
        console.log(sortedData)
        setData({ ...sortedData }); // Set sorted data back to state for the table
  };
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];
  const barColors = ["#1f77b4", "#ff7f0e", "#2ca02c"]


  return (
    <Box sx={{ width: "100%", maxWidth: "60%", margin: "auto", mt: 5, p: 3, bgcolor: "white", boxShadow: 3, borderRadius: 2 }}>
      {/* Custom Styled Tabs */}
      <AppBar position="static" sx={{ background: "transparent", boxShadow: "none" }}>
        <CustomTabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} variant="fullWidth">
          <CustomTab label="Upload File" icon={<UploadFile />} selected={tabIndex === 0} />
          <CustomTab label="Edit Data" icon={<Edit />} selected={tabIndex === 1} disabled={!file} />
          <CustomTab label="Save Data" icon={<Save />} selected={tabIndex === 2} disabled={!isSaved} />
        </CustomTabs>
      </AppBar>

      {/* Step Progress Indicator */}
      <Box sx={{ my: 2 }}>
        <LinearProgress variant="determinate" value={progressValue} sx={{ height: 8, borderRadius: 5 }} />
      </Box>

      <Box sx={{ p: 3 }}>
        {tabIndex === 0 && (
          <Box textAlign="center">
            <input type="file" onChange={handleFileUpload} style={{ marginBottom: "10px" }} />
            <Typography variant="body2" color="textSecondary">
              Upload a PDF file to proceed.
            </Typography>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Edit Table Data
            </Typography>
    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
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
          </TableHead>
          <TableBody>
            {aggregatedData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row) => (
              <TableRow key={row.payee}>
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
                            fontFamily: "'Poppins', sans-serif", letterSpacing: "0.5px"
                        }}
                    >
                        {row.totalAmount.toFixed(2) > 0 ? `+₹${row.totalAmount.toFixed(2)}` : `-₹${Math.abs(row.totalAmount.toFixed(2))}`}
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
                     />
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
            <Button variant="contained" color="primary" onClick={handleSave} sx={{ mt: 2 }}>
              Save & Proceed
            </Button>
          </Box>
        )}

        {tabIndex === 2 && (
          <Box textAlign="center">
            <CheckCircle sx={{ fontSize: 50, color: "green" }} />
            <Typography variant="h5" color="success.main">
              Data Saved Successfully!
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Your data has been sent to the backend.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
