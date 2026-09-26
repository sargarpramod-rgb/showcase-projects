import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  TextField
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from "recharts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { fetchMonthlyTrends, fetchYearlyTrends, fetchCategoryTrends } from "../api/transactionsApi";

export default function TrendAnalysis({ onLoadingChange }) {
  const [trendMode, setTrendMode] = useState("monthly"); // monthly or yearly
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]
    .map(y => y.toString())
    .sort((a, b) => parseInt(b) - parseInt(a));

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      onLoadingChange(true);
      try {
        const options = { signal: controller.signal };
        const [monthly, yearly, categories] = await Promise.all([
          fetchMonthlyTrends(selectedYear, options),
          fetchYearlyTrends(options),
          fetchCategoryTrends(selectedYear, options)
        ]);
        if (!controller.signal.aborted) {
          setMonthlyData(monthly);
          setYearlyData(yearly);
          setCategoryData(categories);
          const totals = categories.reduce((map, row) => {
            const key = row.categoryId == null ? "null" : String(row.categoryId);
            map[key] = (map[key] || 0) + Number(row.totalAmount || 0);
            return map;
          }, {});
          const highest = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
          setSelectedCategoryKey(highest);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setMonthlyData([]);
          setYearlyData([]);
          setError("Failed to load trend data");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          onLoadingChange(false);
        }
      }
    };
    load();
    return () => {
      controller.abort();
      onLoadingChange(false);
    };
  }, [selectedYear, onLoadingChange]);

  const handleYearChange = (newYear) => setSelectedYear(newYear);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(Number(value) || 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, backgroundColor: "#fff", border: "1px solid #ccc" }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {payload[0]?.payload?.month || payload[0]?.payload?.year}
          </Typography>
          {trendMode === "monthly" && (
            <Typography variant="caption" sx={{ display: "block" }}>
              Expense change: {payload[0].payload.absoluteChange == null
                ? "N/A"
                : formatCurrency(payload[0].payload.absoluteChange)}
              {" | "}{payload[0].payload.percentageChange == null
                ? "N/A"
                : Number(payload[0].payload.percentageChange).toFixed(2) + "%"}
            </Typography>
          )}
          {payload.map((entry, index) => (
            <Typography key={index} variant="caption" sx={{ display: "block", color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  const calculateStats = (data, key) => {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
  };

  const currentModeData = trendMode === "monthly" ? monthlyData : yearlyData;
  const categoryTotals = categoryData.reduce((map, row) => {
    const key = row.categoryId == null ? "null" : String(row.categoryId);
    if (!map[key]) map[key] = { key, categoryId: row.categoryId, category: row.category, total: 0 };
    map[key].total += Number(row.totalAmount || 0);
    return map;
  }, {});
  const rankedCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
  const selectedCategory = rankedCategories.find(c => c.key === selectedCategoryKey) || rankedCategories[0];
  const selectedCategoryRows = selectedCategory
    ? categoryData.filter(row => (row.categoryId == null ? "null" : String(row.categoryId)) === selectedCategory.key)
    : [];
  const totalIncome = calculateStats(currentModeData, "income");
  const totalExpenses = calculateStats(currentModeData, "expenses");
  const totalInvestments = calculateStats(currentModeData, "investments");
  const netBalance = calculateStats(currentModeData, "netBalance");
  const unclassifiedCount = calculateStats(currentModeData, "unclassifiedCount");

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <TrendingUpIcon sx={{ fontSize: 28, color: "primary.main" }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Financial Trends
        </Typography>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: "#ffebee", border: "1px solid #ef5350" }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <ToggleButtonGroup
            value={trendMode}
            exclusive
            onChange={(e, newMode) => newMode && setTrendMode(newMode)}
            size="small"
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="yearly">Yearly</ToggleButton>
          </ToggleButtonGroup>

          {trendMode === "monthly" && (
            <Box sx={{ display: "flex", gap: 1 }}>
              {years.map((y) => (
                <Button
                  key={y}
                  variant={selectedYear === y ? "contained" : "outlined"}
                  size="small"
                  onClick={() => handleYearChange(y)}
                >
                  {y}
                </Button>
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      {unclassifiedCount > 0 && (
        <Typography role="status" color="warning.main" sx={{ mb: 2 }}>
          {unclassifiedCount} transaction(s) have an unknown type and are excluded from financial totals.
        </Typography>
      )}
      {currentModeData.some(row => row.partial) && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          The current period is incomplete. Comparisons use spending recorded so far.
        </Typography>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography color="success.main" variant="subtitle2" sx={{ fontWeight: 600 }}>
                Total Income / Credits
              </Typography>
              <Typography variant="h6" sx={{ color: "success.main", fontWeight: 700 }}>
                {formatCurrency(totalIncome)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography color="error" variant="subtitle2" sx={{ fontWeight: 600 }}>
                Total Expenses
              </Typography>
              <Typography variant="h6" sx={{ color: "error.main", fontWeight: 700 }}>
                {formatCurrency(totalExpenses)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography color="warning.main" variant="subtitle2" sx={{ fontWeight: 600 }}>
                Total Investments
              </Typography>
              <Typography variant="h6" sx={{ color: "warning.main", fontWeight: 700 }}>
                {formatCurrency(totalInvestments)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Net Balance
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: netBalance >= 0 ? "success.main" : "error.main",
                  fontWeight: 700
                }}
              >
                {formatCurrency(netBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : currentModeData.some(row => row.transactionCount > 0) ? (
        <Paper sx={{ p: 2 }}>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={currentModeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey={trendMode === "monthly" ? "month" : "year"}
                angle={trendMode === "monthly" ? -45 : 0}
                textAnchor={trendMode === "monthly" ? "end" : "middle"}
                height={trendMode === "monthly" ? 80 : 30}
              />
              <YAxis
                tickFormatter={(value) => `₹${value / 1000}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#4caf50"
                strokeWidth={2}
                name="Income / Credits"
                dot={{ r: 4 }}
              />
              <Bar dataKey="expenses" fill="#f44336" name="Expenses" opacity={0.7} />
              <Bar dataKey="investments" fill="#ff9800" name="Investments" opacity={0.7} />
              <Line
                type="monotone"
                dataKey="netBalance"
                stroke="#2196f3"
                strokeWidth={2}
                name="Net Balance"
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No data available for {trendMode === "monthly" ? `${selectedYear}` : "selected period"}
          </Typography>
        </Paper>
      )}
      {rankedCategories.length > 0 && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Category Spending Trend</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Top categories are ranked by expense total for the selected period.
          </Typography>
          <select
            aria-label="Category"
            value={selectedCategory?.key || ""}
            onChange={(event) => setSelectedCategoryKey(event.target.value)}
            style={{ padding: "8px", minWidth: "220px", marginBottom: "16px" }}
          >
            {rankedCategories.map(category => (
              <option key={category.key} value={category.key}>
                {category.category} ({formatCurrency(category.total)})
              </option>
            ))}
          </select>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={selectedCategoryRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${value / 1000}K`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="totalAmount" stroke="#673ab7" name="Spending" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}
