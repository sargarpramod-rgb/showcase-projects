import React, { useState } from "react";
import {
  Card,
  Typography,
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
// If using Chart.js or Recharts, import here
// import { Pie, Bar } from "react-chartjs-2";

export default function TransactionSummaryView({ summaryData, inflowChartData, outflowChartData }) {
  const [selectedMonth, setSelectedMonth] = useState("December");
  const [selectedYear, setSelectedYear] = useState("2025");

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const years = ["2023","2024","2025"];

  const handleApplyFilter = () => {
    // TODO: fetch filtered summary data from backend
    console.log("Filter applied:", selectedMonth, selectedYear);
  };

  return (
    <Card sx={{ p: 3, boxShadow: 3 }}>
      <Typography variant="h5" gutterBottom>
        Transaction Summary
      </Typography>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField
          select
          label="Month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {months.map((m) => (
            <MenuItem key={m} value={m}>{m}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {years.map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={handleApplyFilter}>
          Apply
        </Button>
      </Box>

      {/* Visuals */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6">Inflow by Category</Typography>
          {/* Replace with <Pie data={inflowChartData} /> */}
          <Box sx={{ height: 200, backgroundColor: "#e0f7fa" }}>Pie Chart Placeholder</Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6">Outflow by Category</Typography>
          {/* Replace with <Bar data={outflowChartData} /> */}
          <Box sx={{ height: 200, backgroundColor: "#fce4ec" }}>Bar Chart Placeholder</Box>
        </Grid>
      </Grid>

      {/* Table */}
      <Table sx={{ mt: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell>Subcategory</TableCell>
            <TableCell>Inflow (₹)</TableCell>
            <TableCell>Outflow (₹)</TableCell>
            <TableCell>Net (₹)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summaryData.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>{row.category}</TableCell>
              <TableCell>{row.subcategory}</TableCell>
              <TableCell>{row.inflow}</TableCell>
              <TableCell>{row.outflow}</TableCell>
              <TableCell>{row.net}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Actions */}
      <Box sx={{ mt: 3 }}>
        <Button variant="contained" color="primary" sx={{ mr: 2 }}>
          Export Summary
        </Button>
        <Button variant="outlined">
          Drill Down by Payee
        </Button>
      </Box>
    </Card>
  );
}