import React, { useState } from "react";
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
import { aggregateTransactions } from "../utils/transactionUtils";
import SummaryView from "../components/summary/SummaryView"
import GroupIcon from '@mui/icons-material/Group';

export default function UploadScreen({ onSave, onBack,data,setData}) {

   const [filterText, setFilterText] = useState("");
   const [showUncategorized, setShowUncategorized] = useState(false);
   const [selectedPayee, setSelectedPayee] = useState(null);
   const [openDialog, setOpenDialog] = useState(false);
   const [showIncome, setShowIncome] = useState(false);

      let smallTransactionsCount = 0;
      let smallTransactionsTotal = 0;
      let smallTransactions = [];


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
          onClick={onSave}
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