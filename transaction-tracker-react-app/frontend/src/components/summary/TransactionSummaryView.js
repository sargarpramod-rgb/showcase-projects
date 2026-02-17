import React, { useState,useEffect,useMemo  } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  Paper,
  TextField,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { ResponsiveContainer, PieChart, Pie, Cell, LabelList, Tooltip } from "recharts";
import config from "../../config/config";
import { fetchPreviousTransactions } from "../../api/transactionsApi";

export default function TransactionSummaryView({onBack,onLoadingChange}) {
  const [rawTransactions, setRawTransactions] = useState("");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [drillCategory, setDrillCategory] = useState(null);
  const [drillSubcategory, setDrillSubcategory] = useState(null);
  const [viewMode, setViewMode] = useState("donut"); // "waterfall" or "treemap"

  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const years = ["2023","2024","2025"];

useEffect(() => {
    const fetchTransactions = async () => {
      try {
         const jwt = localStorage.getItem("jwt");
        onLoadingChange(true);

        const response = await fetchPreviousTransactions();

        setRawTransactions(response);

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


const transactions = Array.isArray(rawTransactions)
  ? rawTransactions.map(t => {
                              const { month, year } = getMonthYear(t.date);
                              return { ...t, month, year };
                            })
  : [];

  console.log("transactions ",transactions)

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
     percent: grandTotal > 0 ? +(item.total / grandTotal * 100).toFixed(1) : 0,
     total: item.total
   }));
 };

 // Color palette
 const palette = [
   "#f44336", "#42a5f5", "#66bb6a", "#ab47bc", "#ff7043",
   "#fdd835", "#9c27b0", "#26a69a", "#8d6e63", "#5c6bc0"
 ];

 // Hash function → stable color for any string (category or subcategory)
const getColorForKey = (key = "") => {
  if (!key) return "#90a4ae"; // fallback gray
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % palette.length);
  return palette[index];
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

const waterfallData = [
  { name: "Income", Income: totalIncome },
  { name: "Investments", Investments: -totalInvestments },
  {
    name: "Expenses",
    ...expenseChartData.reduce((acc, item) => {
      acc[item.category] = -(item.percent / 100) * totalExpenses;
      return acc;
    }, {})
  },
  { name: "Net Balance", NetBalance: netBalance }
];
  const colors = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b"];

    console.log("drillCategory",drillCategory)
  const drillSubcategories = drillCategory
    ? filtered.filter((t) => t.category === drillCategory)
    : [];

  // Summarize by month + subcategory
  const drillSummary = drillSubcategories.reduce((acc, txn) => {
    if (!txn || txn.amount == null) return acc; // null-safe guard

    const key = `${txn.year}-${txn.month}-${txn.subcategory}`;

    if (!acc[key]) {
      acc[key] = {
        month: txn.month,
        year: txn.year,
        subcategory: txn.subcategory,
        totalAmount: 0
      };
    }

    acc[key].totalAmount += txn.amount;
    return acc;
  }, {});

 // 1. Define helpers first
 const getMonthLabel = (t) => {
   // If you already store month as "July", just return t.month
   if (t.month) return t.month;

   // Otherwise derive from date field
   const d = new Date(t.date);
   return d.toLocaleString("en-IN", { month: "long" }); // "January" ... "December"
 };

 const isMonthSelected = (t, selectedMonths) => {
   const m = getMonthLabel(t);
   return selectedMonths.length === 0 ? true : selectedMonths.includes(m);
 };

 // 2. Then compute drillResult
 const drillResult = (() => {
   if (!drillCategory) return [];

   // Filter by category AND selected months
   const filtered = transactions.filter(
     (t) => t.category === drillCategory && selectedMonths.includes(getMonthLabel(t))
   );

   if (selectedMonths.length > 1) {
     // Multiple months → aggregate by subcategory only
     return filtered.reduce((acc, t) => {
       const key = t.subcategory || "Uncategorized";
       let row = acc.find((r) => r.subcategory === key);
       if (!row) {
         row = { subcategory: key, totalAmount: 0 };
         acc.push(row);
       }
       row.totalAmount += Math.abs(t.amount);
       return acc;
     }, []);
   }

   // Single month → aggregate by subcategory for that month
   return filtered.reduce((acc, t) => {
     const key = t.subcategory || "Uncategorized";
     let row = acc.find((r) => r.subcategory === key);
     if (!row) {
       row = { subcategory: key, month: getMonthLabel(t), totalAmount: 0 };
       acc.push(row);
     }
     row.totalAmount += Math.abs(t.amount);
     return acc;
   }, []);
 })();

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
console.log("inflowChartData", inflowChartData);
console.log("expenseChartData", expenseChartData);




   return (
      <Card sx={{ p: 3, boxShadow: 1 }}>
        {/* Header with Back button */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5">Transaction Summary</Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => onBack()}
          >
            Back to Landing
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={3}>
            <Paper sx={{ p: 2 }}>
              <Typography color="success.main" variant="subtitle2">Income</Typography>
              <Typography variant="h6">₹{formatIndianNumber(totalIncome)} (100%)</Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2 }}>
              <Typography color="warning.main" variant="subtitle2">Investments</Typography>
              <Typography variant="h6">₹{formatIndianNumber(totalInvestments)} ({investmentPercent}%)</Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2 }}>
              <Typography color="error" variant="subtitle2">Expenses</Typography>
              <Typography variant="h6">₹{formatIndianNumber(totalExpenses)} ({expensePercent}%)</Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2">Net Balance</Typography>
              <Typography
                variant="h6"
                color={netBalance < 0 ? "error" : "success.main"}
              >
                ₹{formatIndianNumber(netBalance)} ({netBalancePercent}%)
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
            select
            label="Year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            size="small"
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>
          <FormGroup row>
            {months.map((m) => (
              <FormControlLabel
                key={m}
                control={
                  <Checkbox
                    checked={selectedMonths.includes(m)}
                    onChange={() => handleMonthToggle(m)}
                    size="small"
                  />
                }
                label={m}
              />
            ))}
          </FormGroup>
        </Box>

          <Box sx={{ display: "flex", justifyContent: "space-around", mt: 3, flexWrap: "wrap" }}>
            {/* Income Donut */}
            <Box sx={{ width: "30%", minWidth: 280, height: 320 }}>
              <Typography variant="subtitle1" align="center">Income (Credits)</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inflowChartData}
                    dataKey="percent"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    labelLine={false}
                    onClick={(data) => setDrillCategory(data.category)}
                  >
                    {inflowChartData.map((entry, index) => (
                      <Cell key={`income-${index}`} fill={getColorForKey(entry.category)} />
                    ))}
                    <LabelList
                      dataKey="percent"
                      position="outside"
                      formatter={(val, name) => `${name}: ${val}%`}
                      style={{ fontSize: 12 }}
                    />
                  </Pie>
                  <Tooltip formatter={(val, name) => `${name}: ${val}%`} />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Expenses Donut */}
            <Box sx={{ width: "30%", minWidth: 280, height: 320 }}>
              <Typography variant="subtitle1" align="center">Expenses</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    dataKey="percent"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    labelLine={false}
                    onClick={(data) => setDrillCategory(data.category)}
                  >
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`expense-${index}`} fill={getColorForKey(entry.category)} />
                    ))}
                    <LabelList
                      dataKey="percent"
                      position="outside"
                      formatter={(val, name) => `${name}: ${val}%`}
                      style={{ fontSize: 12 }}
                    />
                  </Pie>
                  <Tooltip formatter={(val, name) => `${name}: ${val}%`} />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Net Balance Donut */}
            <Box sx={{ width: "30%", minWidth: 280, height: 320 }}>
              <Typography variant="subtitle1" align="center">Net Balance</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Net Balance", value: netBalance },
                      { name: "Spent", value: totalExpenses + totalInvestments },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    labelLine={false}
                  >
                    <Cell fill={netBalance >= 0 ? "#9c27b0" : "#f44336"} />
                    <Cell fill="#ccc" />
                    <LabelList
                      dataKey="value"
                      position="outside"
                      formatter={(val, name) => `${name}: ₹${formatIndianNumber(val)}`}
                      style={{ fontSize: 12 }}
                    />
                  </Pie>
                  <Tooltip formatter={(val, name) => `${name}: ₹${formatIndianNumber(val)}`} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )

        {/* Drill-down Subcategories */}
        {drillCategory && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1">Subcategories for {drillCategory}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Subcategory</TableCell>
                  {selectedMonths.length === 1 && <TableCell>Month</TableCell>}
                  <TableCell>Amount (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillResult.map((t, idx) => (
                  <TableRow
                    key={idx}
                    hover
                    onClick={() => setDrillSubcategory(t.subcategory)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{t.subcategory}</TableCell>
                    {selectedMonths.length === 1 && <TableCell>{t.month}</TableCell>}
                    <TableCell>₹{formatIndianNumber(Math.abs(t.totalAmount))}</TableCell>
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