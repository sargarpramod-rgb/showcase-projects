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
import { getPeriodLabel } from "./components/utils/dateUtils";
import PayeeTransactionsDialog from "./components/PayeeTransactionsDialog";
import CategoryBreakdownDialog from "./components/CategoryBreakdownDialog";
import LoadingOverlay from "./components/LoadingOverlay";
import UncategorizedView from "./components/UncategorizedView"
import TransactionSummaryView from "./components/TransactionSummaryView"
import UploadView from "./components/UploadView"
import SampleTransactionsDownloader from "./components/SampleTransactionsDownloader"
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertChartIcon from '@mui/icons-material/InsertChart'
import { Chip } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';
import config from './/config';
import { saveTransactions } from "./components/api/transactionsApi";


export default function MultiStepFormWithStyledTabs() {
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
            event.preventDefault();

            const result = await saveTransactions(aggregatedData);
            //console.log("Data saved successfully:", result);
            setIsSaved(true);
          } catch (error) {
            console.error("Error saving the data:", error);
          } finally {
             setSaving(false);
          }
  };

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

   const filteredData = aggregatedData.filter(item => {
     if (!filterText) return true;
     return (
       item.payee?.trim().toLowerCase().includes(filterText.toLowerCase()) ||
       item.category?.trim().toLowerCase().includes(filterText.toLowerCase()) ||
       item.subcategory?.trim().toLowerCase().includes(filterText.toLowerCase())
     );
   });

   aggregatedData = filteredData
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

const periodLabel = getPeriodLabel(aggregatedData);
console.log("monthYearStrings=", periodLabel);


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
          <ListItem button onClick={() => setSelectedOption("samples")}>
            <ListItemText primary="Sample Transactions" />
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
                          setIsSaved(false); // close dialog
                        }}
                        color="primary"
                      >
                        Close
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

            {selectedOption === "samples" && (
               <SampleTransactionsDownloader/>
             )}
      </Box>
    </Box>
    )}
    </>
  )
};
