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

export default function SummaryView({aggregatedData}) {

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

return (

   <>


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



    </>
    );
}