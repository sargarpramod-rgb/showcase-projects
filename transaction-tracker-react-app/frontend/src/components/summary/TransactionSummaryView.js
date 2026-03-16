import React, { useState,useEffect,useMemo, useRef } from "react";
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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import { ResponsiveContainer, PieChart, Pie, Cell, LabelList, Tooltip } from "recharts";
import config from "../../config/config";
import { fetchPreviousTransactions } from "../../api/transactionsApi";
import CategorySettingsDialog from "../dialogs/CategorySettingsDialog";

export default function TransactionSummaryView({onBack,onLoadingChange}) {
  const [rawTransactions, setRawTransactions] = useState("");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [drillCategory, setDrillCategory] = useState(null);
  const [drillSubcategory, setDrillSubcategory] = useState(null);
  const [viewMode, setViewMode] = useState("donut"); // "waterfall" or "treemap"
  const [openCategorySettings, setOpenCategorySettings] = useState(false);

  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const years = ["2023","2024","2025"];

  const drillRef = useRef(null);

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

useEffect(() => {
  // Scroll drill section into view when a category is selected
  if (drillCategory && drillRef.current) {
    drillRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // If there is exactly one subcategory for this category, open it automatically so details show immediately
    const subs = Array.from(new Set(filtered.filter(t => t.category === drillCategory).map(t => t.subcategory)));
    if (subs.length === 1) {
      setDrillSubcategory(subs[0]);
    } else {
      setDrillSubcategory(null);
    }
  }
}, [drillCategory]);

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

  // console.log("transactions ",transactions)

  const handleMonthToggle = (month) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const handleMonthSelectChange = (event) => {
    const value = event.target.value;
    setSelectedMonths(
      // On autofill we get a stringified value
      typeof value === 'string' ? value.split(',') : value
    );
  };

  // Ensure when no months are selected we show all months
  const filtered = transactions.filter(
    (t) => (selectedMonths.length === 0 || selectedMonths.includes(t.month)) && t.year === parseInt(selectedYear)
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

    // console.log("drillCategory",drillCategory)
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
     (t) => t.category === drillCategory && (selectedMonths.length === 0 || selectedMonths.includes(getMonthLabel(t)))
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

// Tighter chart / typography values for denser displays
const CHART_HEIGHT = 260;
const INNER_RADIUS = 60;
const OUTER_RADIUS = 100;
const LABEL_FONT_SIZE = 11;


   return (
      <Card sx={{ p: 2, boxShadow: 1, maxWidth: 1200, margin: '0 auto' }}>
        {/* Header with Back button */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => onBack()}
            size="small"
          >
            Back to Landing
          </Button>
          {/* optional settings button on the right (uncomment if needed) */}
        </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Summary Cards */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 1.25 }}>
              <Typography color="success.main" variant="subtitle2">Income</Typography>
              <Typography variant="subtitle1">₹{formatIndianNumber(totalIncome)} (100%)</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 1.25 }}>
              <Typography color="warning.main" variant="subtitle2">Investments</Typography>
              <Typography variant="subtitle1">₹{formatIndianNumber(totalInvestments)} ({investmentPercent}%)</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 1.25 }}>
              <Typography color="error" variant="subtitle2">Expenses</Typography>
              <Typography variant="subtitle1">₹{formatIndianNumber(totalExpenses)} ({expensePercent}%)</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 1.25 }}>
              <Typography variant="subtitle2">Net Balance</Typography>
              <Typography
                variant="subtitle1"
                color={netBalance < 0 ? "error" : "success.main"}
              >
                ₹{formatIndianNumber(netBalance)} ({netBalancePercent}%)
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* Compact month multi-select (chips) to reduce horizontal clutter */}
          <FormControl sx={{ minWidth: 220 }} size="small">
            <InputLabel id="month-select-label">Months</InputLabel>
            <Select
              labelId="month-select-label"
              multiple
              value={selectedMonths}
              onChange={handleMonthSelectChange}
              input={<OutlinedInput id="select-months-chip" label="Months" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {months.map((m) => (
                <MenuItem key={m} value={m}>
                  <Checkbox checked={selectedMonths.indexOf(m) > -1} size="small" />
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

          {/* Charts: use Grid with responsive columns so alignment stays correct */}
          <Grid container spacing={2} sx={{ mt: 1, mb: 2, alignItems: 'stretch' }}>
            {/* Income Donut */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 1.5, height: '100%' }}>
                <Typography variant="subtitle2" align="center">Income (Credits)</Typography>
                <Box sx={{ width: '100%', height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {filtered.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>No data for selected months</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inflowChartData}
                          dataKey="percent"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={INNER_RADIUS}
                          outerRadius={OUTER_RADIUS}
                          labelLine={false}
                          onClick={(entry) => entry && setDrillCategory(entry.category)}
                          cursor="pointer"
                        >
                          {inflowChartData.map((entry, index) => (
                            <Cell key={`income-${index}`} fill={getColorForKey(entry.category)} />
                          ))}
                          <LabelList
                            dataKey="percent"
                            position="outside"
                            formatter={(val, name) => `${name}: ${val}%`}
                            style={{ fontSize: LABEL_FONT_SIZE }}
                          />
                        </Pie>
                        <Tooltip formatter={(val, name) => `${name}: ${val}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Expenses Donut */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 1.5, height: '100%' }}>
                <Typography variant="subtitle2" align="center">Expenses</Typography>
                <Box sx={{ width: '100%', height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {filtered.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>No data for selected months</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseChartData}
                          dataKey="percent"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={INNER_RADIUS}
                          outerRadius={OUTER_RADIUS}
                          labelLine={false}
                          onClick={(entry) => entry && setDrillCategory(entry.category)}
                          cursor="pointer"
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell key={`expense-${index}`} fill={getColorForKey(entry.category)} />
                          ))}
                          <LabelList
                            dataKey="percent"
                            position="outside"
                            formatter={(val, name) => `${name}: ${val}%`}
                            style={{ fontSize: LABEL_FONT_SIZE }}
                          />
                        </Pie>
                        <Tooltip formatter={(val, name) => `${name}: ${val}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Net Balance Donut */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 1.5, height: '100%' }}>
                <Typography variant="subtitle2" align="center">Net Balance</Typography>
                <Box sx={{ width: '100%', height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {filtered.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>No data for selected months</Typography>
                  ) : (
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
                          innerRadius={INNER_RADIUS}
                          outerRadius={OUTER_RADIUS}
                          labelLine={false}
                        >
                          <Cell fill={netBalance >= 0 ? "#9c27b0" : "#f44336"} />
                          <Cell fill="#ccc" />
                          <LabelList
                            dataKey="value"
                            position="outside"
                            formatter={(val, name) => `${name}: ₹${formatIndianNumber(val)}`}
                            style={{ fontSize: LABEL_FONT_SIZE }}
                          />
                        </Pie>
                        <Tooltip formatter={(val, name) => `${name}: ₹${formatIndianNumber(val)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>

        {/* Drill-down Subcategories */}
        {drillCategory && (
          <Box ref={drillRef} sx={{ mt: 2 }}>
            <Paper sx={{ p: 2 }} elevation={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Subcategories for {drillCategory}</Typography>
                <Button size="small" onClick={() => setDrillCategory(null)}>Clear</Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Subcategory</TableCell>
                    {selectedMonths.length === 1 && <TableCell>Month</TableCell>}
                    <TableCell>Amount (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drillResult.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography color="text.secondary">No subcategories available for the selected months.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    drillResult.map((t, idx) => (
                      <TableRow
                        key={idx}
                        hover
                        selected={drillSubcategory === t.subcategory}
                        onClick={() => setDrillSubcategory(t.subcategory)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>{t.subcategory}</TableCell>
                        {selectedMonths.length === 1 && <TableCell>{t.month}</TableCell>}
                        <TableCell>₹{formatIndianNumber(Math.abs(t.totalAmount))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}



      {/*  Drill-down Table */}
     {drillSubcategory && (
       <Box sx={{ mt: 2 }}>
         <Paper sx={{ p: 2 }} elevation={1}>
           <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
             <Typography variant="h6">Transactions for {drillSubcategory}</Typography>
             <Button size="small" variant="outlined" onClick={() => setDrillSubcategory(null)}>Clear Drill‑Down</Button>
           </Box>
           <Table size="small">
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
                     (selectedMonths.length === 0 || selectedMonths.includes(t.month))
                 )
                 .reduce((acc, t) => { acc.push(t); return acc; }, [])
                 .length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary">No transactions available for this subcategory in the selected months.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions
                    .filter(
                      (t) =>
                        t.subcategory === drillSubcategory &&
                        t.year === parseInt(selectedYear) &&
                        (selectedMonths.length === 0 || selectedMonths.includes(t.month))
                    )
                    .map((t, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>{t.subcategory}</TableCell>
                        <TableCell>{t.month}</TableCell>
                        <TableCell>{Math.abs(t.amount)}</TableCell>
                        <TableCell>{t.txnType}</TableCell>
                      </TableRow>
                    ))
                )}
             </TableBody>
         </Table>
         </Paper>
       </Box>
     )}


    </Card>
  );

}