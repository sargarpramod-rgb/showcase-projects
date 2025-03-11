import { Table, TableBody, TableCell, TableContainer, Button,TableHead, TableRow, Paper  } from "@mui/material";
import { Dialog,DialogActions, DialogContent, DialogTitle} from "@mui/material";

export default function PayeeTransactionsDialog({ payee,payeeTransactions,openDialog, setOpenDialog}) {


    return (

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Transactions for {payee}</DialogTitle>
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
                        {payeeTransactions?.map((txn, index) => (
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
    );
}
