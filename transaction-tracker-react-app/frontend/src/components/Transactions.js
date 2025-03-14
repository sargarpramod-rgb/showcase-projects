import React, { useState } from "react";
import CategorySelector from "./CategorySelector";
import { Tooltip as MuiTooltip,AppBar, Tabs, Tab, Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TextField, LinearProgress,IconButton,InputAdornment  } from "@mui/material";
import {TablePagination} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear"; // Import Clear Icon

export default function Transactions({ filters, transactionsData, modalHandlers }) {

      const { filterText, setFilterText } = filters;
      const { aggregatedData, data, setData, smallTransactions } = transactionsData;
      const { setSelectedPayee, setOpenDialog } = modalHandlers;
      const [page, setPage] = useState(0);
      const [rowsPerPage, setRowsPerPage] = useState(10);


return (
        <Box>
              <TableContainer component={Paper} sx={{ maxHeight: 500, marginTop: 2 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                          {[
                            { key: "payee", label: "Payee" },
                            { key: "totalAmount", label: "Total Amount" },
                            { key: "transactionCount", label: "Transaction Count" },
                            { key: "category", label: "Category" },
                            { key: "subcategory", label: "Sub-category" }
                          ].map(({ key, label }) => (
                            <TableCell key={key}>
                              {key !== "totalAmount" && key !== "transactionCount" ? ( <TextField
                                size="small"
                                variant="outlined"
                                placeholder={`Search ${label}`}
                                onChange={(e) => setFilterText(prev => ({ ...prev, [key]: e.target.value }))}
                                value={filterText[key]}
                                fullWidth
                                InputProps={{
                                              endAdornment: (
                                                <InputAdornment position="end">
                                                  <IconButton  onClick={(e) => setFilterText(prev => ({ ...prev, [key]: "" }))} size="small">
                                                    <ClearIcon />
                                                  </IconButton>
                                                </InputAdornment>
                                              ),
                                            }}

                              />) : null}
                            </TableCell>
                          ))}
                        </TableRow>
                  </TableHead>
                  <TableBody>
                    {aggregatedData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row) => (
                      <TableRow key={row.payee}>
                        <TableCell>
                            <MuiTooltip title={row.payeeFullName} arrow>
                                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px", display: "inline-block" }}>
                                  {row.payee}
                                </span>
                            </MuiTooltip>
                        </TableCell>
                        <TableCell>
                             <Typography
                                style={{
                                    color: row.totalAmount > 0 ? "green" : "#ff6666",
                                    fontFamily: "'Poppins', sans-serif", letterSpacing: "0.5px"
                                }}
                            >
                                {row.totalAmount.toFixed(2) > 0 ? `+₹${row.totalAmount.toFixed(2)}` : `-₹${Math.abs(row.totalAmount.toFixed(2))}`}
                            </Typography>
                        </TableCell>
                        <TableCell>
                          <Button onClick={() => { setSelectedPayee(row); setOpenDialog(true); }}>
                            {row.transactionCount}
                          </Button>
                        </TableCell>
                       <TableCell>
                          <CategorySelector
                            category={row.transactions[0].category}
                            payee={row.payee}
                            data={data}
                            setData={setData}
                            smallTransactions={smallTransactions}
                            type="category"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                        <CategorySelector
                              category={row.transactions[0].category}
                              subcategory={row.transactions[0].subcategory}
                              payee={row.payee}
                              data={data}
                              setData={setData}
                              smallTransactions={smallTransactions}
                              type="subcategory"
                              size="small"
                             />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination component="div" count={aggregatedData.length} page={page} onPageChange={(event, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(event) => setRowsPerPage(parseInt(event.target.value, 10))} />
            </Box>
    );
}