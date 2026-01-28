import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import HistoryIcon from "@mui/icons-material/History";
import LoadingOverlay from "../components/LoadingOverlay";
import { uploadTransactions } from "../api/transactionsApi";
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function LandingScreen({ onViewTransactionsClick,
            onLoadingChange,
            onDataChange,
            onActiveScreen}) {
  const userName = localStorage.getItem("loggedInUser");

const onUploadClick = async (event) => {
      const uploadedFile = event.target.files[0];

      // bubble up file + loading state
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

  return (
  <>

    <Box sx={{ p: 3, backgroundColor: "#f2f3f3", minHeight: "100vh" }}>
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        Welcome back, {userName}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        Manage your finances with clarity and control.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Options */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
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

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
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
              See your current year and last 3 months by default.
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
      </Grid>

      {/* Summary Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Quick Summary
        </Typography>
        <Grid container spacing={2}>
          {[
            { label: "Income", value: "₹0", color: "success.main" },
            { label: "Expenses", value: "₹0", color: "error.main" },
            { label: "Investments", value: "₹0", color: "success.main" },
            { label: "Net Balance", value: "₹0", color: "success.main" },
            { label: "Uncategorized", value: "0", color: "warning.main" }
          ].map((item, idx) => (
            <Grid item xs={12} sm={6} md={2} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  textAlign: "center",
                  border: "1px solid #d5dbdb",
                  borderRadius: 1,
                  backgroundColor: "#fff"
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
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
      </Box>
    </Box>
    </>
  );
}