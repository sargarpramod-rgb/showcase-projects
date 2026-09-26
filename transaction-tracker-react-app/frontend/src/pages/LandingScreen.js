import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  IconButton,
  Tooltip
} from "@mui/material";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import HistoryIcon from "@mui/icons-material/History";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import LoadingOverlay from "../components/LoadingOverlay";
import { uploadTransactions, fetchMonthlyTrends, fetchCategoryTrends } from "../api/transactionsApi";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CategorySettingsDialog from "../components/dialogs/CategorySettingsDialog";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LandingScreen({ onViewTransactionsClick, onViewTrendsClick,
            onLoadingChange,
            onDataChange,
            onActiveScreen}) {
  const userName = localStorage.getItem("loggedInUser");
  const [openCategorySettings, setOpenCategorySettings] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.toISOString().slice(0, 7));
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const year = Number(selectedMonth.slice(0, 4));
    setSummaryLoading(true);
    Promise.all([
      fetchMonthlyTrends(year, { signal: controller.signal }),
      fetchCategoryTrends(year, { signal: controller.signal })
    ]).then(([monthly, categories]) => {
      if (!controller.signal.aborted) {
        setMonthlyData(monthly || []);
        setCategoryData(categories || []);
        setSummaryError(null);
      }
    }).catch(error => {
      if (!controller.signal.aborted) {
        setMonthlyData([]);
        setCategoryData([]);
        setSummaryError("Unable to load your financial summary");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setSummaryLoading(false);
    });
    return () => controller.abort();
  }, [selectedMonth]);

  const current = monthlyData.find(row => row.month === selectedMonth) || null;
  const monthCategories = useMemo(() => categoryData.filter(row => row.month === selectedMonth), [categoryData, selectedMonth]);
  const categoryTotals = useMemo(() => {
    const totals = monthCategories.map(row => ({ ...row, amount: Number(row.totalAmount || 0) }))
      .filter(row => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const total = totals.reduce((sum, row) => sum + row.amount, 0);
    return { rows: totals, total };
  }, [monthCategories]);
  const topCategories = categoryTotals.rows.slice(0, 5);
  const changes = useMemo(() => monthCategories
    .filter(row => row.previousMonthAmount != null && Number(row.absoluteChange || 0) !== 0)
    .sort((a, b) => Math.abs(Number(b.absoluteChange || 0)) - Math.abs(Number(a.absoluteChange || 0)))
    .slice(0, 4), [monthCategories]);
  const formatCurrency = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T00:00:00`));
  const insights = useMemo(() => {
    if (!current) return [];
    const result = [];
    if (current.previousMonthAmount != null && Number(current.absoluteChange || 0) !== 0) {
      result.push(`You spent ${formatCurrency(Math.abs(Number(current.absoluteChange)))} ${Number(current.absoluteChange) > 0 ? "more" : "less"} than last month.`);
    }
    const increase = changes.find(row => Number(row.absoluteChange || 0) > 0);
    if (increase) result.push(`${increase.category || "Uncategorized"} was your largest spending increase this month.`);
    if (categoryTotals.total > 0 && topCategories.length >= 2) {
      const share = ((topCategories[0].amount + topCategories[1].amount) / categoryTotals.total) * 100;
      if (share >= 40) result.push(`${topCategories[0].category} and ${topCategories[1].category} accounted for ${share.toFixed(0)}% of your spending.`);
    }
    if (Number(current.income || 0) > 0 && Number(current.investments || 0) > 0) {
      result.push(`You invested ${formatCurrency(current.investments)}, around ${(Number(current.investments) / Number(current.income) * 100).toFixed(0)}% of your income.`);
    }
    return result.slice(0, 3);
  }, [current, changes, categoryTotals.total, topCategories]);

  const onUploadClick = async (event) => {
    const uploadedFile = event.target.files[0];
    onLoadingChange(true);

    if (uploadedFile) {
      try {
        const result = await uploadTransactions(uploadedFile);
        onDataChange(result);
        onActiveScreen("upload");
        console.log("File uploaded successfully:", result);
      } catch (error) {
        console.error("Error uploading file:", error);
      } finally {
        onLoadingChange(false);
      }
    } else {
      onLoadingChange(false);
    }
  };

  const onLogoutClick = async () => {
    await logout(); // blacklists tokens + clears cookies via /auth/logout
    navigate("/login");
  };

  return (
  <>
    <Box sx={{ p: 3, backgroundColor: "#f2f3f3", minHeight: "100vh" }}>

      {/* Header with Settings + Logout */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Welcome back, {userName}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Manage your finances with clarity and control.
          </Typography>
        </Box>

        {/* Icon buttons â€” Settings + Logout */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Category Settings">
            <IconButton
              onClick={() => setOpenCategorySettings(true)}
              sx={{
                backgroundColor: "#fff",
                border: "1px solid #d5dbdb",
                borderRadius: "50%",
                width: 44,
                height: 44,
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                  borderColor: "primary.main",
                  color: "primary.main"
                }
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Logout">
            <IconButton
              onClick={onLogoutClick}
              sx={{
                backgroundColor: "#fff",
                border: "1px solid #d5dbdb",
                borderRadius: "50%",
                width: 44,
                height: 44,
                "&:hover": {
                  backgroundColor: "#fff5f5",
                  borderColor: "error.main",
                  color: "error.main"
                }
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Options */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              border: "1px solid #d5dbdb",
              borderRadius: 2,
              "&:hover": { borderColor: "primary.main" }
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Upload Transactions
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Upload and categorize your expenses, income, and investments.
            </Typography>
            <input
              accept="file/*"
              style={{ display: 'none' }}
              id="upload-file"
              type="file"
              onChange={onUploadClick}
            />
            <label htmlFor="upload-file">
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                color="primary"
                component="span"
              >
                UPLOAD FILE
              </Button>
            </label>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              border: "1px solid #d5dbdb",
              borderRadius: 2,
              "&:hover": { borderColor: "secondary.main" }
            }}
          >
            <HistoryIcon sx={{ fontSize: 40, color: "secondary.main", mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              View Past Transactions
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              See your transactions by year with detailed categorization.
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={onViewTransactionsClick}
            >
              View Transactions
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              border: "1px solid #d5dbdb",
              borderRadius: 2,
              "&:hover": { borderColor: "success.main" }
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 40, color: "success.main", mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Financial Trends
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Analyze income, expenses, and investments month-on-month.
            </Typography>
            <Button
              variant="outlined"
              color="success"
              size="small"
              onClick={onViewTrendsClick}
            >
              View Trends
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Whereâ€™s My Money At?</Typography><Typography variant="body2" color="text.secondary">{monthLabel}</Typography></Box>
          <FormControl size="small" sx={{ minWidth: 170 }}><InputLabel>Period</InputLabel><Select value={selectedMonth} label="Period" onChange={e => setSelectedMonth(e.target.value)}>{Array.from({ length: 12 }, (_, index) => { const date = new Date(now.getFullYear(), index, 1); const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; return <MenuItem key={value} value={value}>{date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</MenuItem>; })}</Select></FormControl>
        </Box>
        {summaryLoading && <Paper sx={{ p: 3, textAlign: "center" }}><Typography color="text.secondary">Loading summaryâ€¦</Typography></Paper>}
        {!summaryLoading && summaryError && <Paper sx={{ p: 2, border: "1px solid #ef5350" }}><Typography color="error">{summaryError}</Typography></Paper>}
        {!summaryLoading && !summaryError && <>
          <Grid container spacing={2} sx={{ mb: 3 }}>{[["Income / credits", current?.income, "success.main"], ["Expenses", current?.expenses, "error.main"], ["Investments", current?.investments, "primary.main"], ["Money left", current?.netBalance, Number(current?.netBalance || 0) < 0 ? "error.main" : "success.main"]].map(([label, value, color]) => <Grid item xs={12} sm={6} md={3} key={label}><Paper elevation={0} sx={{ p: label === "Money left" ? 2.5 : 2, border: label === "Money left" ? "2px solid" : "1px solid #d5dbdb", borderColor: label === "Money left" ? color : "#d5dbdb", borderRadius: 1, backgroundColor: label === "Money left" ? "#fbfffc" : "#fff" }}><Typography variant="caption" fontWeight={600}>{label}</Typography><Typography variant={label === "Money left" ? "h5" : "h6"} sx={{ color, fontWeight: 700 }}>{formatCurrency(value)}</Typography></Paper></Grid>)}</Grid>
          {monthCategories.filter(row => row.categoryId == null).reduce((sum, row) => sum + Number(row.transactionCount || 0), 0) > 0 && <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #f0c36d", backgroundColor: "#fffaf0" }}><Typography variant="body2">{monthCategories.filter(row => row.categoryId == null).reduce((sum, row) => sum + Number(row.transactionCount || 0), 0)} transactions need categorization <Button size="small" onClick={onViewTransactionsClick}>Review</Button></Typography></Paper>}
          <Grid container spacing={3}><Grid item xs={12} md={6}><Paper elevation={0} sx={{ p: 2, height: "100%", border: "1px solid #d5dbdb" }}><Typography variant="subtitle1" fontWeight={700}>Where did it go?</Typography>{topCategories.length === 0 ? <Typography variant="body2" color="text.secondary">No expenses for this period.</Typography> : topCategories.map(row => <Box key={`${row.categoryId}-${row.category}`} sx={{ display: "flex", justifyContent: "space-between", py: .75, color: row.categoryId == null ? "warning.dark" : "inherit" }}><Typography variant="body2" fontWeight={row.categoryId == null ? 700 : 400}>{row.categoryId == null ? "Needs categorization" : row.category}</Typography><Typography variant="body2" fontWeight={600}>{formatCurrency(row.amount)} ({categoryTotals.total ? ((row.amount / categoryTotals.total) * 100).toFixed(0) : 0}%)</Typography></Box>)}</Paper></Grid>
          <Grid item xs={12} md={6}><Paper elevation={0} sx={{ p: 2, height: "100%", border: "1px solid #d5dbdb" }}><Typography variant="subtitle1" fontWeight={700}>What changed?</Typography>{changes.length === 0 ? <Typography variant="body2" color="text.secondary">No meaningful month-over-month changes.</Typography> : changes.map(row => { const comparable = row.previousMonthAmount != null && Number(row.previousMonthAmount) !== 0; return <Box key={`${row.categoryId}-${row.category}`} sx={{ display: "flex", justifyContent: "space-between", py: .75 }}><Typography variant="body2">{comparable ? (Number(row.absoluteChange) > 0 ? "↑" : "↓") : ""} {comparable ? (row.category || "Uncategorized") : `New this month: ${row.category || "Uncategorized"}`}</Typography><Typography variant="body2" fontWeight={600}>{formatCurrency(Math.abs(Number(row.absoluteChange)))} {comparable && row.percentageChange != null ? `(${Number(row.percentageChange) > 0 ? "+" : ""}${Number(row.percentageChange).toFixed(0)}%)` : ""}</Typography></Box>; })}</Paper></Grid></Grid>
          {insights.length > 0 && <Paper elevation={0} sx={{ p: 2, mt: 3, border: "1px solid #d5dbdb" }}><Typography variant="subtitle1" fontWeight={700}>Insights</Typography>{insights.map(insight => <Typography key={insight} variant="body2" sx={{ py: .35 }}>â€¢ {insight}</Typography>)}</Paper>}
        </>}
      </Box>
    </Box>

    <CategorySettingsDialog
      open={openCategorySettings}
      setOpen={setOpenCategorySettings}
    />
  </>
  );
}
