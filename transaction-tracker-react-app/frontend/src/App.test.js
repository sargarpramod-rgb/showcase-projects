import { useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Button, TablePagination, Typography, Box, Grid } from "@mui/material";

function getRandomDate() {
  const start = new Date(2023, 0, 1);
  const end = new Date(2024, 11, 31);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toLocaleDateString("en-GB");
}

const mockResponse = {
  "RAUT RUPESH MOTIRAM": [
    { "number": null, "date": getRandomDate(), "payee": "RAUT RUPESH MOTIRAM", "amount": -273.0, "memo": null, "category": "", "subcategory": "" }
  ],
  "Mr BHIMRAO RAMCHANDR": [
    { "number": null, "date": getRandomDate(), "payee": "Mr BHIMRAO RAMCHANDR", "amount": -10000.0, "memo": null, "category": "", "subcategory": "" }
  ],
  "UBER INDIA SYSTEMS P": [
    { "number": null, "date": getRandomDate(), "payee": "UBER INDIA SYSTEMS P", "amount": -185.03, "memo": null, "category": "", "subcategory": "" },
    { "number": null, "date": getRandomDate(), "payee": "UBER INDIA SYSTEMS P", "amount": -109.53, "memo": null, "category": "", "subcategory": "" }
  ]
};

function ListComponent() {
  const [data, setData] = useState(mockResponse);
  const [filterText, setFilterText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState(null);

  const aggregatedData = Object.entries(data).reduce((acc, [payee, transactions]) => {
    const totalAmount = transactions.reduce((sum, txn) => sum + txn.amount, 0);
    acc.push({
      payee,
      totalAmount,
      transactionCount: transactions.length,
      transactions
    });
    return acc;
  }, []);

  return (
    <Box sx={{ maxWidth: "80%", margin: "auto", padding: 3 }}>
      <Typography variant="h4" gutterBottom align="center">Transaction Summary</Typography>
      <Grid container spacing={2} alignItems="center" justifyContent="space-between">
        <Grid item xs={12} sm={6}>
          <TextField
            label="Filter by Payee"
            variant="outlined"
            size="small"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            fullWidth
          />
        </Grid>
      </Grid>
      <TableContainer component={Paper} sx={{ maxHeight: 500, marginTop: 2 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell><b>Payee</b></TableCell>
              <TableCell><b>Total Amount</b></TableCell>
              <TableCell><b>Transaction Count</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {aggregatedData.filter(row => row.payee.toLowerCase().includes(filterText.toLowerCase()))
              .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
              .map((row) => (
                <TableRow key={row.payee}>
                  <TableCell>{row.payee}</TableCell>
                  <TableCell>{row.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button onClick={() => { setSelectedPayee(row); setOpenDialog(true); }}>
                      {row.transactionCount}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={aggregatedData.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => setRowsPerPage(parseInt(event.target.value, 10))}
      />
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transactions for {selectedPayee?.payee}</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><b>Date</b></TableCell>
                  <TableCell><b>Amount</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedPayee?.transactions.map((txn, index) => (
                  <TableRow key={index}>
                    <TableCell>{txn.date}</TableCell>
                    <TableCell>{txn.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ListComponent;
