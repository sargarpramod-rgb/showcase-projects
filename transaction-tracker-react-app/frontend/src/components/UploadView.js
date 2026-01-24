import React, { useState } from "react";
import { Tooltip as MuiTooltip,AppBar, Tabs, Tab, Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, LinearProgress,IconButton,InputAdornment  } from "@mui/material";
import { styled } from "@mui/system";
import { CheckCircle, UploadFile, Edit, Save } from "@mui/icons-material";
import {Drawer, List, ListItem, ListItemText, Card,Dialog,DialogActions, DialogContent, DialogTitle, TablePagination, Grid, MenuItem, Select,Toolbar,Avatar} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend,ResponsiveContainer, BarChart,XAxis,YAxis,Bar } from "recharts";
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertChartIcon from '@mui/icons-material/InsertChart'
import { Chip } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SummaryView from "./SummaryView"
import config from "../config";

export default function UploadView({onFileChange, onLoadingChange,
onDataChange,handleOpenChartDialog,aggregatedData,
onUncategorizedClick,showUncategorized,
onIncomeClick,showIncome}) {


const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];

    // bubble up file + loading state
    onFileChange(uploadedFile);
    onLoadingChange(true);

    if (uploadedFile) {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      try {
        const jwt = localStorage.getItem("jwt");

        const response = await fetch(`${config.API_BASE}/api/upload-transaction-file`, {
          method: "POST",
          headers: {
                                'Authorization': `Bearer ${jwt}`
                            },
          body: formData,
        });

        if (!response.ok) {
          throw new Error("File upload failed");
        }

        const result = await response.json();

        // bubble up data to App.js
        onDataChange(result);
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

var userName = localStorage.getItem("loggedInUser")

return (
    <Box>
      <AppBar position="static" sx={{
                                    backgroundColor: "#f5f7fa", // light gray/blue tone
                                    color: "#333",              // dark text for readability
                                    boxShadow: "none",          // remove heavy shadow
                                    borderBottom: "1px solid #ddd", // subtle divider line
                                  }}
      >
              <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6">Expense Tracker Dashboard</Typography>

                <Box display="flex" alignItems="center" gap={1}>
                  {userName && (
                    <>
                      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                        Welcome, {userName}
                      </Typography>
                      <Avatar sx={{ bgcolor: "secondary.main" }}>
                        {userName.charAt(0).toUpperCase()}
                      </Avatar>
                    </>
                  )}
                </Box>
              </Toolbar>
            </AppBar>

    <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
          >
                       <input
                         accept="file/*"
                         style={{ display: 'none' }}
                         id="upload-file"
                         type="file"
                         onChange={handleFileUpload}
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

                        <SummaryView
                        aggregatedData={aggregatedData}
                        onUncategorizedClick={onUncategorizedClick}
                        showUncategorized={showUncategorized}
                         onIncomeClick = {onIncomeClick}
                         showIncome = {showIncome}/>
                        {/* <Button variant="contained" startIcon={<InsertChartIcon />} onClick={handleOpenChartDialog} color="primary">SHOW CHARTS</Button> */}

                       </Box>

        </Box>

);
}
