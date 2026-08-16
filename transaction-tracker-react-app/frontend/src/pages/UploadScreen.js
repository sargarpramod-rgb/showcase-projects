import React, { useState,useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider
} from "@mui/material";
import { getPeriodLabel } from "../utils/dateUtils";
import Transactions from "../components/tables/Transactions";
import PayeeTransactionsDialog from "../components/dialogs/PayeeTransactionsDialog";
import SuccessDialog from "../components/dialogs/SuccessDialog";
import { aggregateTransactions } from "../utils/transactionUtils";
import SummaryView from "../components/summary/SummaryView"
import GroupIcon from '@mui/icons-material/Group';
import { saveTransactions } from "../api/transactionsApi";

export default function UploadScreen({ setActiveScreen,setSaving, onBack,data,setData}) {

   const [filterText, setFilterText] = useState("");
   const [showUncategorized, setShowUncategorized] = useState(false);
   const [selectedPayee, setSelectedPayee] = useState(null);
   const [openDialog, setOpenDialog] = useState(false);
   const [showIncome, setShowIncome] = useState(false);
   const [isSaved, setIsSaved] = useState(false);
   const [uploadId, setUploadId] = useState(null);

   // Update uploadId only when the API response uploadId changes.
   useEffect(() => {
     if (data?.uploadId != null) {
       setUploadId(data.uploadId);
     }
   }, [data?.uploadId]);

   const {
     baseAggregatedData,
     smallTransactions,
     smallTransactionsCount,
     smallTransactionsTotal
   } = useMemo(() => {
     const transactions = data?.transactions ?? [];

     let nextSmallTransactionsCount = 0;
     let nextSmallTransactionsTotal = 0;
     const nextSmallTransactions = [];

     const transactionsByPayee = transactions.reduce(
       (groups, transaction) => {
         const payee = transaction.payee || "Unknown Payee";

         if (!groups[payee]) {
           groups[payee] = [];
         }

         groups[payee].push(transaction);
         return groups;
       },
       {}
     );

     const groupedData = Object.entries(transactionsByPayee)
       .reduce((acc, [payee, payeeTransactions]) => {
         const filteredTransactions = payeeTransactions.filter(
           txn => Math.abs(Number(txn.amount)) >= 50
         );

         const smallTxns = payeeTransactions.filter(
           txn => Math.abs(Number(txn.amount)) < 50
         );

         if (smallTxns.length > 0) {
           nextSmallTransactionsCount += smallTxns.length;

           nextSmallTransactionsTotal += smallTxns.reduce(
             (sum, txn) => sum + Number(txn.amount),
             0
           );

           nextSmallTransactions.push(...smallTxns);
         }

         if (filteredTransactions.length > 0) {
           const totalAmount = filteredTransactions.reduce(
             (sum, txn) => sum + Number(txn.amount),
             0
           );

           acc.push({
             payee,
             totalAmount,
             payeeFullName: filteredTransactions[0].payeeFullName,
             transactionCount: filteredTransactions.length,
             transactions: filteredTransactions,
             category: filteredTransactions[0].category,
             subcategory: filteredTransactions[0].subcategory
           });
         }

         return acc;
       }, [])
       .sort(
         (first, second) =>
           Math.abs(second.totalAmount) - Math.abs(first.totalAmount)
       );

     if (nextSmallTransactionsCount > 0) {
       groupedData.push({
         payee: "Small Transactions",
         totalAmount: nextSmallTransactionsTotal,
         transactionCount: nextSmallTransactionsCount,
         transactions: nextSmallTransactions,
         category: null,
         subcategory: null
       });
     }

     return {
       baseAggregatedData: groupedData,
       smallTransactions: nextSmallTransactions,
       smallTransactionsCount: nextSmallTransactionsCount,
       smallTransactionsTotal: nextSmallTransactionsTotal
     };
   }, [data?.transactions]);

   // Apply UI filters without changing baseAggregatedData.
   const aggregatedData = useMemo(() => {
     return baseAggregatedData
       .filter(item => {
         if (!filterText) {
           return true;
         }

         const searchText = filterText.trim().toLowerCase();

         return (
           item.payee?.trim().toLowerCase().includes(searchText) ||
           item.category?.trim().toLowerCase().includes(searchText) ||
           item.subcategory?.trim().toLowerCase().includes(searchText)
         );
       })
       .map(item => {
         const transactions = Array.isArray(item.transactions)
           ? item.transactions
           : [];

         let filteredTransactions = transactions;

         if (showUncategorized) {
           filteredTransactions = transactions.filter(
             txn => !txn.category || !txn.subcategory
           );
         } else if (showIncome) {
           filteredTransactions = transactions.filter(
             txn => Number(txn.amount) > 0
           );
         }

         return {
           ...item,
           transactions: filteredTransactions,
           transactionCount: filteredTransactions.length,
           totalAmount: filteredTransactions.reduce(
             (sum, txn) => sum + Number(txn.amount),
             0
           )
         };
       })
       .filter(item => item.transactions.length > 0);
   }, [
     baseAggregatedData,
     filterText,
     showUncategorized,
     showIncome
   ]);

   const uncategorizedTxList = useMemo(
     () =>
       baseAggregatedData.flatMap(item =>
         item.transactions.filter(
           txn => !txn.category || !txn.subcategory
         )
       ),
     [baseAggregatedData]
   );

   const uncategorizedCount = uncategorizedTxList.length;

   const handleBulkApply = (selectedIds, category, subCategory) => {
     console.log(
       "Bulk apply:",
       selectedIds,
       category,
       subCategory
     );

     setShowUncategorized(false);
   };

   const periodLabel = getPeriodLabel(aggregatedData);

const handleSaveAndClose = async (event) => {

     setSaving(true)
     try {
             event.preventDefault();

             const result = await saveTransactions(uploadId, aggregatedData);
             setIsSaved(true);
           } catch (error) {
             console.error("Error saving the data:", error);
           } finally {
              setSaving(false);
           }
   };

  return (
  <>
    <Box sx={{ p: 3, backgroundColor: "#f2f3f3", minHeight: "100vh" }}>
      {/* Header */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Upload Transactions
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Review, categorize, and save your uploaded transactions.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Summary Panel */}
      <SummaryView
              aggregatedData={aggregatedData}
              onUncategorizedClick={() => setShowUncategorized(prev => !prev)}
              showUncategorized={showUncategorized}
               onIncomeClick = {() => setShowIncome(prev => !prev)}
               showIncome = {showIncome}
      />

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

        <PayeeTransactionsDialog
            payee={selectedPayee?.payee}
            payeeTransactions={selectedPayee?.transactions}
            openDialog={openDialog}
            setOpenDialog={setOpenDialog}
        />

      <SuccessDialog
        isSaved={isSaved}
        setIsSaved={setIsSaved}
        setActiveScreen={setActiveScreen}
       />

      {/* Sticky Action Bar */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          backgroundColor: "#fff",
          borderTop: "1px solid #d5dbdb",
          p: 2,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          zIndex: 1000
        }}
      >
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleSaveAndClose}
        >
          Save & Close
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={onBack}
        >
          Return to Overview
        </Button>
      </Box>
    </Box>
    </>
  );

}