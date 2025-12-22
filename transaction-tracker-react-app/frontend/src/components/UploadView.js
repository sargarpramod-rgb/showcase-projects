import React, { useState } from "react";
import { Tooltip as MuiTooltip,AppBar, Tabs, Tab, Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, LinearProgress,IconButton,InputAdornment  } from "@mui/material";
import { styled } from "@mui/system";
import { CheckCircle, UploadFile, Edit, Save } from "@mui/icons-material";
import {Drawer, List, ListItem, ListItemText, Card,Dialog,DialogActions, DialogContent, DialogTitle, TablePagination, Grid, MenuItem, Select} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend,ResponsiveContainer, BarChart,XAxis,YAxis,Bar } from "recharts";
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertChartIcon from '@mui/icons-material/InsertChart'
import { Chip } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function UploadView({onFileChange, onLoadingChange, onDataChange,handleOpenChartDialog,aggregatedData}) {

 const summary = {
     expenses: aggregatedData
                      .flatMap(item => item.transactions.filter(txn => txn.txnType === "Debit"))
                      .reduce((acc, txn) => acc + txn.amount, 0),
     income: aggregatedData
       .flatMap(item => item.transactions.filter(txn => txn.txnType === "Credit"))
       .reduce((acc, txn) => acc + txn.amount, 0),
     uncategorized: aggregatedData
       .flatMap(item => item.transactions.filter(txn => !txn.category))
       .length
   };

    const netBalance = summary.income - Math.abs(summary.expenses);
    console.log("summary"+JSON.stringify(summary, null, 2))
const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];

    // bubble up file + loading state
    onFileChange(uploadedFile);
    onLoadingChange(true);

    if (uploadedFile) {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      try {
        const response = await fetch("http://localhost:8080/api/upload-transaction-file", {
          method: "POST",
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


return (

    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
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

                        <Chip
                          label={`Expenses: ₹${Math.abs(Math.round(summary.expenses))}`}
                          color="error"
                        />

                        <Chip
                          label={`Income: ₹${Math.round(summary.income)}`}
                          color="success"
                        />

                        <Chip
                          icon={netBalance < 0 ? <WarningIcon /> : <CheckCircleIcon />}
                          label={`Net Balance: ₹${netBalance.toLocaleString()}`}
                          color={netBalance < 0 ? "error" : "success"}
                          variant="outlined"
                        />

                        <Chip
                          label={`Uncategorized: ${summary.uncategorized}`}
                          color="warning"
                        />
                        <Button variant="contained" startIcon={<InsertChartIcon />} onClick={handleOpenChartDialog} color="primary">SHOW CHARTS</Button>
                </Box>


);
}
