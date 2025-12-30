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
import LoadingOverlay from "./components/LoadingOverlay";
import UncategorizedView from "./components/UncategorizedView"
import TransactionSummaryView from "./components/TransactionSummaryView"
import UploadView from "./components/UploadView"
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertChartIcon from '@mui/icons-material/InsertChart'
import { Chip } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';

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
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [showUncategorized, setShowUncategorized] = useState(false);
    const [showIncome, setShowIncome] = useState(false);


  const handleChange = (id, key, value) => {
    setData(data.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const handleSave = async (event) => {

    setSaving(true)
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
          } finally {
             setSaving(false);
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

 console.log("original aggregatedData"+JSON.stringify(aggregatedData, null, 2))

   aggregatedData = aggregatedData
     .filter(item => !isPayeeSet || item.payee?.trim().toLowerCase().includes(normalizedFilterPayee))
     .filter(item => !isCategorySet || (item.category?.trim().toLowerCase().includes(normalizedFilterCategory)
                                        && item.category !== "undefined"))
     .filter(item => !isSubCategorySet || (item.subcategory?.trim().toLowerCase().includes(normalizedFilterSubCategory)
                                           && item.subcategory !== "undefined"))
     .map(item => {
       // safeguard for missing transactions
       const txns = Array.isArray(item.transactions) ? item.transactions : [];

       const filteredTxns = showUncategorized
         ? txns.filter(txn => !txn.category || !txn.subcategory) // only uncategorized
         : showIncome ? txns.filter(txn => txn.amount > 0) : txns;                             // all transactions

       return {
         ...item,
         transactions: filteredTxns,
         transactionCount: filteredTxns.length,
         totalAmount: filteredTxns.reduce((sum, txn) => sum + txn.amount, 0)
       };
     })
     // remove items that end up with no transactions
     .filter(item => item.transactions.length > 0);


    // compute uncategorized transactions at App level
      const uncategorizedTxList = aggregatedData
        .flatMap(item => item.transactions.filter(txn => !txn.category));

      const uncategorizedCount = uncategorizedTxList.length;

      const handleBulkApply = (selectedIds, category, subCategory) => {
        // update logic here
        console.log("Bulk apply:", selectedIds, category, subCategory);
        setShowUncategorized(false); // optionally hide after apply
      };
    console.log("aggregatedData"+JSON.stringify(aggregatedData, null, 2))

// Utility: convert date string → "Month-Year"
const formatMonthYear = (dateStr) => {
  // Take only the dd-mm-yyyy part
  const rawDate = dateStr.split(" ")[0]; // "09-10-2025"
  const [month, day, year] = rawDate.split("-");
  const jsDate = new Date(`${year}-${month}-${day}`);

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  return `${monthNames[jsDate.getMonth()]}-${jsDate.getFullYear()}`;
};

// Loop through outer array + inner transactions
const uniqueMonthYears = [
  ...new Set(
    aggregatedData.flatMap(item =>
      Array.isArray(item.transactions)
        ? item.transactions.map(txn => formatMonthYear(txn.date))
        : []
    )
  )
];

console.log("monthYearStrings=",uniqueMonthYears);

const periodLabel = uniqueMonthYears.length > 0
  ? uniqueMonthYears.join(", ")
  : "Selected Period";


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
    <>

    {showSummary && (
      <TransactionSummaryView
        summaryData={aggregatedData}
        inflowChartData={''}
        outflowChartData={''}
      />
    )}

 {!showSummary && (
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
            <UploadView
                onFileChange={setFile}
                onLoadingChange={setLoading}
                onDataChange={setData}
                handleOpenChartDialog={handleOpenChartDialog}
                aggregatedData={aggregatedData}
                onUncategorizedClick={() => setShowUncategorized(prev => !prev)}
                showUncategorized={showUncategorized}
                onIncomeClick={() => setShowIncome(prev => !prev)}
                showIncome={showIncome}

            />




            <LoadingOverlay loading={loading} message="Uploading…" />
            <LoadingOverlay loading={saving} message="Saving Transactions…" />

            <Dialog open={isSaved} onClose={() => setIsSaved(false)}>
                    <DialogTitle>Success</DialogTitle>
                    <DialogContent>
                      <Typography>Transactions saved successfully!</Typography>
                    </DialogContent>
                    <DialogActions>
                      <Button
                        onClick={() => {
                          setShowSummary(true);
                          setIsSaved(false); // close dialog
                        }}
                        color="primary"
                      >
                        View Summary
                      </Button>
                    </DialogActions>
                  </Dialog>


            {showSummary && (
              <TransactionSummaryView
                summaryData={aggregatedData} // pass your processed summary data
                inflowChartData={''}
                outflowChartData={''}
              />
            )}

            {aggregatedData.length > 0 && (
              <Box>
                 <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                   {showUncategorized ? (
                     <>
                       <GroupIcon fontSize="small" sx={{ mr: 1 }} />
                       Bulk Categorization
                     </>
                   ) : (
                     <>Edit Transactions for {periodLabel}</>
                   )}
                 </Typography>


                  <Transactions
                        filters={{ filterText, setFilterText,showUncategorized }}
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
                <TransactionSummaryView
                    onLoadingChange={setLoading}/>
              </Card>
            )}
      </Box>
    </Box>
    )}
    </>
  )
};
