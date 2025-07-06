import React, { useState } from "react";
import { Tooltip as MuiTooltip,AppBar, Tabs, Tab, Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, LinearProgress,IconButton,InputAdornment  } from "@mui/material";
import { styled } from "@mui/system";
import { CheckCircle, UploadFile, Edit, Save } from "@mui/icons-material";
import {Drawer, List, ListItem, ListItemText, Card,Dialog,DialogActions, DialogContent, DialogTitle, TablePagination, Grid, MenuItem, Select} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend,ResponsiveContainer, BarChart,XAxis,YAxis,Bar } from "recharts";
import mockResponse from './mockData'
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";
import Transactions from "./components/Transactions";
import PayeeTransactionsDialog from "./components/PayeeTransactionsDialog";
import CategoryBreakdownDialog from "./components/CategoryBreakdownDialog";

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

    const [data, setData] = useState("");
    const [filterText, setFilterText] = useState("");
    const [openChartDialog, setOpenChartDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPayee, setSelectedPayee] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedOption, setSelectedOption] = useState("upload");

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


  return (
    <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#f4f6f8" }}>
      {/* Custom Styled Tabs */}
      <Drawer variant="permanent" anchor="left" sx={{ width: 240, flexShrink: 0, "& .MuiDrawer-paper": { width: 240, boxSizing: "border-box" }}}>
        <List>
          <ListItem button onClick={() => setSelectedOption("upload")}>
            <ListItemText primary="Upload Transactions" />
          </ListItem>
          <ListItem button onClick={() => setSelectedOption("view")}>
            <ListItemText primary="View Past Transactions" />
          </ListItem>
        </List>
      </Drawer>
        <Box sx={{ flexGrow: 1, p: 3 }}>
            {selectedOption === "upload" && (
              <Card sx={{ p: 3, boxShadow: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Upload Transactions
                </Typography>
                <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} sx={{ mb: 2 }}>
                  Upload File
                  <input type="file" hidden onChange={handleFileUpload} />
                </Button>

            {aggregatedData.length > 0 && (
              <Box>
                  <Typography variant="h6" gutterBottom>
                    Edit Transactions
                  </Typography>
                    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                        <Grid item xs={12} sm={6} textAlign="right">
                          <Button variant="contained" color="secondary" onClick={handleOpenChartDialog}>
                            Show Pie Chart
                          </Button>
                        </Grid>
                      </Grid>
                  <Transactions
                        filters={{ filterText, setFilterText }}
                        transactionsData={{ aggregatedData, data, setData, smallTransactions }}
                        modalHandlers={{ setSelectedPayee, setOpenDialog }}
                   />
                   <CategoryBreakdownDialog
                        openChartDialog={openChartDialog}
                        handleCloseChartDialog={handleCloseChartDialog}
                        handleCategoryClick={handleCategoryClick}
                        selectedCategory={selectedCategory}
                        aggregatedData={aggregatedData}
                    />
                    <PayeeTransactionsDialog
                        payee={selectedPayee?.payee}
                        payeeTransactions={selectedPayee?.transactions}
                        openDialog={openDialog}
                        setOpenDialog={setOpenDialog}
                    />
                    <Button variant="contained" color="primary" startIcon={<SaveIcon />} sx={{ mt: 2 }} onClick={handleSave}>
                      Save Transactions
                    </Button>
              </Box>
            )}
          </Card>
         )}

            {selectedOption === "view" && (
              <Card sx={{ p: 3, boxShadow: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Past Transactions
                </Typography>
                <Typography variant="body1">Functionality to view past transactions will be implemented here.</Typography>
              </Card>
            )}
      </Box>
    </Box>
  );
}
