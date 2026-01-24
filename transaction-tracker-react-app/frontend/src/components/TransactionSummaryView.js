import React, { useState,useEffect,useMemo  } from "react";
import {
  Card, Typography, Box, Grid, TextField, MenuItem,
  Button, FormGroup, FormControlLabel, Checkbox, Paper,
  Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import {
  Treemap ,BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,LabelList,
  PieChart, Pie, Cell
} from "recharts";
import config from "../config";

export default function TransactionSummaryView({onLoadingChange}) {
  const [rawTransactions, setRawTransactions] = useState("");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [drillCategory, setDrillCategory] = useState(null);
  const [drillSubcategory, setDrillSubcategory] = useState(null);
  const [viewMode, setViewMode] = useState("waterfall"); // "waterfall" or "treemap"

  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const years = ["2023","2024","2025"];

useEffect(() => {
    const fetchTransactions = async () => {
      try {
         const jwt = localStorage.getItem("jwt");
        onLoadingChange(true);

        const response = await fetch(`${config.API_BASE}/api/transactions-summary-by/2025`, {
                  method: "GET",
                  headers: {
                    "Authorization": `Bearer ${jwt}`,   // Attach JWT here
                    "Content-Type": "application/json"
                  }
                })
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

        <Box sx={{ mb: 2 }}>
          <Button
            variant={viewMode === "waterfall" ? "contained" : "outlined"}
            onClick={() => setViewMode("waterfall")}
            sx={{ mr: 1 }}
          >
            Waterfall
          </Button>
          <Button
            variant={viewMode === "treemap" ? "contained" : "outlined"}
            onClick={() => setViewMode("treemap")}
            sx={{ mr: 1 }}
          >
            Treemap
          </Button>
          <Button
            variant={viewMode === "donut" ? "contained" : "outlined"}
            onClick={() => setViewMode("donut")}
          >
            Donut
          </Button>
        </Box>

      {viewMode === "waterfall" && (
       <>
        <Typography variant="h6" sx={{ mt: 3 }}>Money Flow (Waterfall View)</Typography>
        <Box sx={{ height: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
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
              ]}
              barSize={50} // thicker bars for readability
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(val) => `₹${formatIndianNumber(Math.abs(val))}`} />
              <Legend />

              {/* Income */}
              <Bar dataKey="Income" stackId="a" fill="#4caf50">
                <LabelList
                  dataKey="Income"
                  position="top"
                  formatter={(val) => `₹${formatIndianNumber(val)}`}
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
              </Bar>

              {/* Investments */}
              <Bar dataKey="Investments" stackId="a" fill="#2196f3">
                <LabelList
                  dataKey="Investments"
                  position="top"
                  formatter={(val) => `₹${formatIndianNumber(Math.abs(val))}`}
                  style={{ fontSize: 12 }}
                />
              </Bar>

              {/* Expenses broken down by category */}
              {expenseChartData.map((item, idx) => (
                <Bar
                  key={idx}
                  dataKey={item.category}
                  stackId="a"
                  fill={getColorForKey(item.category)}
                  onClick={() => setDrillCategory(item.category)}
                >
                  <LabelList
                    dataKey={item.category}
                    position="outside"
                    formatter={(val) => `₹${formatIndianNumber(Math.abs(val))}`}
                    style={{ fontSize: 11 }}
                  />
                </Bar>
              ))}

              {/* Net Balance */}
              <Bar dataKey="NetBalance" stackId="a" fill={netBalance >= 0 ? "#9c27b0" : "#f44336"}>
                <LabelList
                  dataKey="NetBalance"
                  position="top"
                  formatter={(val) => `₹${formatIndianNumber(Math.abs(val))}`}
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
        </>
      )}

      {viewMode === "treemap" && (
        <Box sx={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={(expenseChartData || []).map(item => ({
                name: item.category,
                size: parseFloat(item.percent),
                category: item.category
              }))}
              dataKey="size"
              nameKey="name"
              aspectRatio={4/3}
              stroke="#fff"
              content={({ x, y, width, height, name, size, category }) => {
                const fillColor = getColorForKey(category);
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      style={{ fill: fillColor, stroke: "#fff", cursor: "pointer" }}
                      onClick={() => setDrillCategory(category)}
                    />
                    {width > 60 && height > 20 && (
                      <text x={x + 5} y={y + 15} fontSize={12} fill="#fff" pointerEvents="none">
                        {name} ({size}%)
                      </text>
                    )}
                  </g>
                );
              }}
            />
          </ResponsiveContainer>
        </Box>
      )}

     {viewMode === "donut" && (
       <Box sx={{ display: "flex", justifyContent: "space-around", mt: 3, flexWrap: "wrap" }}>
         {/* Income Donut */}
         <Box sx={{ width: "30%", minWidth: 280, height: 320 }}>
           <Typography variant="h6" align="center">Income (Credits)</Typography>
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
           <Typography variant="h6" align="center">Expenses</Typography>
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
           <Typography variant="h6" align="center">Net Balance</Typography>
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie
                 data={[
                   { name: "Net Balance", value: netBalance },
                   { name: "Spent", value: totalExpenses + totalInvestments }
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
     )}


      {/* Drill-down Subcategories */}
      {drillCategory && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Subcategories for {drillCategory}</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Subcategory</TableCell>
                {selectedMonths.length === 1 && <TableCell>Month</TableCell>}
                <TableCell>Amount (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drillResult.map((t, idx) => (
                <TableRow key={idx} onClick={() => setDrillSubcategory(t.subcategory)}>
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