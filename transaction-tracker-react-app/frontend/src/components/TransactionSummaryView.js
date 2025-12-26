import React, { useState,useEffect } from "react";
import {
  Card, Typography, Box, Grid, TextField, MenuItem,
  Button, FormGroup, FormControlLabel, Checkbox, Paper,
  Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function TransactionSummaryView({onLoadingChange}) {
  const [rawTransactions, setRawTransactions] = useState("");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [drillCategory, setDrillCategory] = useState(null);
  const [drillSubcategory, setDrillSubcategory] = useState(null);

  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const years = ["2023","2024","2025"];

useEffect(() => {
    const fetchTransactions = async () => {
      try {
        onLoadingChange(true);

        const response = await fetch("http://localhost:8080/api/transactions-summary-by/2025");
        const json = await response.json();

        setRawTransactions(json);

        onLoadingChange(false);
      } catch (error) {
        console.error("Failed to load transactions:", error);
        onLoadingChange(false);
      }
    };
    fetchTransactions();
  }, [onLoadingChange]);
// Utility to extract month name and year from date string
const getMonthYear = (dateStr) => {
  const d = new Date(dateStr);
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  return {
    month: monthNames[d.getMonth()],
    year: d.getFullYear()
  };
};


// Example JSON transactions (replace with API or props)

const transactions = Array.isArray(rawTransactions)
  ? rawTransactions.map(t => {
                              const { month, year } = getMonthYear(t.date);
                              return { ...t, month, year };
                            })
  : [];

  console.log("transactions ",transactions)

 /* // Normalize transactions: add month/year fields
    const transactions = rawTransactions.map(t => {
      const { month, year } = getMonthYear(t.date);
      return { ...t, month, year };
    });*/


  const handleMonthToggle = (month) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const filtered = transactions.filter(
    (t) => selectedMonths.includes(t.month) && t.year === parseInt(selectedYear)
  );

  //  Split into inflows vs outflows
  const inflows = filtered.filter((t) => t.txnType === "Credit");
  const outflows = filtered.filter((t) => t.txnType === "Debit");

  //  Aggregate by category
 //  Aggregate by category with normalization
 const aggregateByCategoryPercent = (data) => {
   // Step 1: aggregate raw totals
   const totals = data.reduce((acc, row) => {
     let existing = acc.find((item) => item.category === row.category);
     if (!existing) {
       existing = { category: row.category, total: 0 };
       acc.push(existing);
     }
     existing.total += Math.abs(row.amount);
     return acc;
   }, []);

   // Step 2: compute grand total
   const grandTotal = totals.reduce((sum, item) => sum + item.total, 0);

   // Step 3: convert to percentages
   return totals.map((item) => ({
     category: item.category,
     percent: grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : 0,
   }));
 };

 //  Use for inflows and outflows separately
 const inflowChartData = aggregateByCategoryPercent(inflows);


 const investmentOutflows = outflows.filter(t => t.category === "Investments");
 const expenseOutflows    = outflows.filter(t => t.category !== "Investments");

 const totalInvestments = investmentOutflows.reduce((sum, r) => sum + Math.abs(r.amount), 0);
 const totalExpenses    = expenseOutflows.reduce((sum, r) => sum + Math.abs(r.amount), 0);
  const totalIncome   = inflows.reduce((sum, r) => sum + Math.abs(r.amount), 0);
  const netBalance    = totalIncome - (totalExpenses + totalInvestments);

const expenseChartData = aggregateByCategoryPercent(expenseOutflows);

  const colors = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b"];

  //  Drill-down subcategories
  const drillSubcategories = drillCategory
    ? filtered.filter((t) => t.category === drillCategory)
    : [];

  //  Drill-down transactions
  const drillTransactions = drillSubcategory
    ? filtered.filter((t) => t.subcategory === drillSubcategory)
    : [];

  const formatIndianNumber = (num) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0
    }).format(num);
  };

// Percentages relative to income
const investmentPercent = totalIncome > 0 ? ((totalInvestments / totalIncome) * 100).toFixed(1) : 0;
const expensePercent    = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0;
const netBalancePercent = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0;

  return (
    <Card sx={{ p: 3, boxShadow: 3 }}>
      <Typography variant="h5" gutterBottom>Transaction Summary</Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={3}>
                  <Paper sx={{ p: 2, bgcolor: "#e8f5e9" }}>
                    <Typography color="success.main" variant="h6">Income</Typography>
                    <Typography variant="h5">₹{formatIndianNumber(totalIncome)} (100%) </Typography>
                  </Paper>
                </Grid>
        <Grid item xs={3}>
          <Paper sx={{ p: 2, bgcolor: "#fff3e0" }}>
            <Typography color="warning.main" variant="h6">Investments</Typography>
            <Typography variant="h5">₹{formatIndianNumber(totalInvestments)} ({investmentPercent}%)</Typography>
          </Paper>
        </Grid>
        <Grid item xs={3}>
                  <Paper sx={{ p: 2, bgcolor: "#ffebee" }}>
                    <Typography color="error" variant="h6">Expenses</Typography>
                    <Typography variant="h5">₹{formatIndianNumber(totalExpenses)} ({expensePercent}%)</Typography>
                  </Paper>
        </Grid>
        <Grid item xs={3}>
          <Paper sx={{ p: 2, bgcolor: "#e3f2fd" }}>
            <Typography variant="h6">Net Balance</Typography>
            <Typography variant="h5" color={netBalance < 0 ? "error" : "success.main"}>
              ₹{formatIndianNumber(netBalance)} ({netBalancePercent}%)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField select label="Year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <FormGroup row>
          {months.map((m) => (
            <FormControlLabel
              key={m}
              control={<Checkbox checked={selectedMonths.includes(m)} onChange={() => handleMonthToggle(m)} />}
              label={m}
            />
          ))}
        </FormGroup>
      </Box>

      {/* Income Chart */}
      <Typography variant="h6">Income by Category (%)</Typography>
      <Box sx={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={inflowChartData}
            barCategoryGap="30%"   // space between categories
            barGap={5}             // space between bars in same category
           >
            <XAxis dataKey="category" />
            <YAxis unit="%" />
            <Tooltip />
            <Legend />
            <Bar dataKey="percent" fill="#4caf50" barSize={40} onClick={(data) => setDrillCategory(data.category)} />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Typography variant="h6" sx={{ mt: 3 }}>Expenses by Category (%)</Typography>
      <Box sx={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={expenseChartData}
            barCategoryGap="30%"   // space between categories
            barGap={5}
          >// space between bars in same category>
            <XAxis dataKey="category" />
            <YAxis unit="%" />
            <Tooltip />
            <Legend />
            <Bar dataKey="percent" fill="#f44336" barSize={40} onClick={(data) => setDrillCategory(data.category)} />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Drill-down Subcategories */}
      {drillCategory && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Subcategories for {drillCategory}</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Subcategory</TableCell>
                <TableCell>Month</TableCell>
                <TableCell>Amount (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drillSubcategories.map((t, idx) => (
                <TableRow key={idx} onClick={() => setDrillSubcategory(t.subcategory)}>
                  <TableCell>{t.subcategory}</TableCell>
                  <TableCell>{t.month}</TableCell>
                  <TableCell>{Math.abs(t.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/*  Drill-down Table */}
     {drillSubcategory && (
       <Box sx={{ mt: 3 }}>
         <Typography variant="h6" gutterBottom>
           Transactions for {drillSubcategory}
         </Typography>
         <Table>
           <TableHead>
             <TableRow>
               <TableCell>Category</TableCell>
               <TableCell>Subcategory</TableCell>
               <TableCell>Month</TableCell>
               <TableCell>Amount (₹)</TableCell>
               <TableCell>Type</TableCell>
             </TableRow>
           </TableHead>
           <TableBody>
             {transactions
               .filter(
                 (t) =>
                   t.subcategory === drillSubcategory &&
                   t.year === parseInt(selectedYear) &&
                   selectedMonths.includes(t.month)
               )
               .map((t, idx) => (
                 <TableRow key={idx}>
                   <TableCell>{t.category}</TableCell>
                   <TableCell>{t.subcategory}</TableCell>
                   <TableCell>{t.month}</TableCell>
                   <TableCell>{Math.abs(t.amount)}</TableCell>
                   <TableCell>{t.txnType}</TableCell>
                 </TableRow>
               ))}
           </TableBody>
         </Table>

         {/* Clear Drill‑Down Button */}
         <Box sx={{ mt: 2 }}>
           <Button
             variant="outlined"
             color="secondary"
             onClick={() => setDrillSubcategory(null)}
           >
             Clear Drill‑Down
           </Button>
         </Box>
       </Box>
     )}
    </Card>
  );
}