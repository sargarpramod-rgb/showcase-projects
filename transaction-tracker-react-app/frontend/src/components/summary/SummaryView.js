import React from "react";
import { Grid, Paper, Typography } from "@mui/material";

export default function SummaryView({
  aggregatedData,
  onUncategorizedClick,
  showUncategorized,
  onIncomeClick,
  showIncome
}) {
  const summary = {
    expenses: aggregatedData
      .flatMap(item =>
        item.transactions.filter(
          txn =>
            txn.category &&
            txn.category !== "Investments" &&
            txn.amount < 0
        )
      )
      .reduce((acc, txn) => acc + txn.amount, 0),
    investments: aggregatedData
      .flatMap(item =>
        item.transactions.filter(
          txn => txn.category && txn.category === "Investments"
        )
      )
      .reduce((acc, txn) => acc + txn.amount, 0),
    income: aggregatedData
      .flatMap(item =>
        item.transactions.filter(
          txn => txn.amount > 0
        )
      )
      .reduce((acc, txn) => acc + txn.amount, 0),
    uncategorized: aggregatedData
      .flatMap(item => item.transactions.filter(txn => !txn.category))
      .length
  };

  const netBalance =
    summary.income - Math.abs(summary.investments + summary.expenses);

  const items = [
    {
      label: "Income",
      value: showIncome ? "Clear" : `₹${Math.round(summary.income)}`,
      color: "success.main",
      onClick: onIncomeClick
    },
    {
      label: "Expenses",
      value: `₹${Math.abs(Math.round(summary.expenses))}`,
      color: "error.main"
    },
    {
      label: "Investments",
      value: `₹${Math.round(summary.investments)}`,
      color: "success.main"
    },
    {
      label: "Net Balance",
      value: `₹${Math.abs(Math.round(netBalance))}`,
      color: netBalance < 0 ? "error.main" : "success.main"
    },
    {
      label: "Uncategorized",
      value: showUncategorized ? "Clear" : `${summary.uncategorized}`,
      color: "warning.main",
      onClick: onUncategorizedClick
    }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {items.map((item, idx) => (
        <Grid item xs={12} sm={6} md={2} key={idx}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              textAlign: "center",
              border: "1px solid #d5dbdb",
              borderRadius: 1,
              backgroundColor: "#fff",
              cursor: item.onClick ? "pointer" : "default",
              transition: "background-color 0.2s ease-in-out",
              "&:hover": item.onClick
                ? { backgroundColor: "#f7f9f9" }
                : {}
            }}
            onClick={item.onClick}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: item.onClick ? "primary.main" : "text.primary"
              }}
            >
              {item.label}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: item.color, fontWeight: 700 }}
            >
              {item.value}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}