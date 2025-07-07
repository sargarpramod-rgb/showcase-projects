import React, { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { ActionTypes, Directions } from "../types";
import { isTransactionValid } from "../App";

/**
 * TransactionTable component displays and manages a list of transactions.
 * It provides functionality for adding, editing, and deleting transactions.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.initialTransactions - The initial list of transactions to display.
 * @param {function} props.onTransactionsChange - Callback function triggered when transactions are added, updated, or deleted.
 */
const TransactionTable = ({ initialTransactions, onTransactionsChange }) => {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [editingId, setEditingId] = useState(null); // ID of the transaction currently being edited

  // State for the new transaction being added
  const [newTxn, setNewTxn] = useState({
    transactionId: 0,
    tradeId: 0,
    version: 1,
    securityCode: "",
    quantity: 0,
    action: "INSERT", // Default action type
    direction: "Buy", // Default direction
  });

  /**
   * Handles adding a new transaction to the table.
   * Generates a new unique transactionId.
   */
  const handleAdd = () => {
    // Determine the next available transaction ID
    const nextId =
      transactions.length > 0 ? Math.max(...transactions.map((t) => t.transactionId)) + 1 : 1;
    const txnToAdd = { ...newTxn, transactionId: nextId };

    // --- Validation check using the external isTransactionValid function ---
    if (!isTransactionValid(txnToAdd, transactions)) {
      return;
    }

    const updatedTransactions = [...transactions, txnToAdd];
    setTransactions(updatedTransactions);
    // Reset new transaction form fields after adding
    setNewTxn({ ...newTxn, tradeId: 0, version: 1, securityCode: "", quantity: 0 }); // Reset fields for new entry
    onTransactionsChange?.(updatedTransactions); // Notify parent of changes
  };

  /**
   * Handles deleting a transaction from the table.
   * @param {number} id - The ID of the transaction to delete.
   */
  const handleDelete = (id) => {
    const updatedTransactions = transactions.filter((txn) => txn.transactionId !== id);
    setTransactions(updatedTransactions);
    onTransactionsChange?.(updatedTransactions); // Notify parent of changes
  };

  /**
   * Sets the `editingId` to the ID of the transaction to be edited.
   * @param {number} id - The ID of the transaction to edit.
   */
  const handleEdit = (id) => {
    setEditingId(id);
  };

  /**
   * Saves the changes made to an edited transaction.
   * Resets `editingId` to null and notifies parent of changes.
   */
  const handleSave = () => {

    setEditingId(null);
    onTransactionsChange?.(transactions); // Notify parent of changes
  };

  /**
   * Handles changes to a specific field of an existing transaction.
   * @param {number} id - The ID of the transaction to update.
   * @param {string} field - The name of the field to update (e.g., "quantity", "securityCode").
   * @param {any} value - The new value for the field.
   */
  const handleChange = (id, field, value) => {
    const updatedTransactions = transactions.map((txn) =>
      txn.transactionId === id ? { ...txn, [field]: value } : txn
    );
    setTransactions(updatedTransactions);
  };


  const parseIntegerInput = (value) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <Box sx={{ p: 3, bgcolor: "background.paper", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3, color: "text.primary" }}>
        Transactions
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table sx={{ minWidth: 650 }} size="small" aria-label="transaction table">
          <TableHead sx={{ bgcolor: "primary.light" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>ID</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">Trade ID</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">Version</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">Security</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">Qty</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">Action</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">Buy/Sell</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Render existing transactions */}
            {transactions.map((txn) => (
              <TableRow key={txn.transactionId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">
                  {txn.transactionId}
                </TableCell>
                <TableCell align="center">
                  {txn.tradeId}
                </TableCell>
                <TableCell align="center">
                  {txn.version}
                </TableCell>
                <TableCell align="center">
                  {/* Security Code - Editable */}
                  {editingId === txn.transactionId ? (
                    <TextField
                      type="text"
                      value={txn.securityCode}
                      onChange={(e) => handleChange(txn.transactionId, "securityCode", e.target.value)}
                      size="small"
                      variant="outlined"
                      sx={{ width: 100 }}
                    />
                  ) : (
                    txn.securityCode
                  )}
                </TableCell>
                <TableCell align="center">
                  {/* Quantity - Editable */}
                  {editingId === txn.transactionId ? (
                    <TextField
                      type="number"
                      value={txn.quantity}
                      onChange={(e) =>
                        handleChange(txn.transactionId, "quantity", parseIntegerInput(e.target.value))
                      }
                      size="small"
                      variant="outlined"
                      sx={{ width: 80 }}
                    />
                  ) : (
                    txn.quantity
                  )}
                </TableCell>
                <TableCell align="center">
                  {txn.action}
                </TableCell>
                <TableCell align="center">
                  {/* Buy/Sell (Direction) - Editable */}
                  {editingId === txn.transactionId ? (
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={txn.direction}
                        onChange={(e) => handleChange(txn.transactionId, "direction", e.target.value)}
                        variant="outlined"
                        displayEmpty
                      >
                        {Directions.map((dir) => (
                          <MenuItem key={dir} value={dir}>
                            {dir}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    txn.direction
                  )}
                </TableCell>
                <TableCell align="center">
                  {editingId === txn.transactionId ? (
                    <Button onClick={handleSave} variant="contained" color="primary" size="small">
                      Save
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleEdit(txn.transactionId)}
                        variant="outlined"
                        color="info" // Use info for edit
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(txn.transactionId)}
                        variant="outlined"
                        color="error" // Use error for delete
                        size="small"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {/* Row for adding a new transaction - all fields editable here for new entry */}
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell sx={{ color: "text.secondary" }}>Auto</TableCell>
              <TableCell align="center">
                <TextField
                  type="number"
                  value={newTxn.tradeId}
                  onChange={(e) => setNewTxn({ ...newTxn, tradeId: parseIntegerInput(e.target.value) })}
                  size="small"
                  variant="outlined"
                  placeholder="Trade ID"
                  sx={{ width: 80 }}
                />
              </TableCell>
              <TableCell align="center">
                <TextField
                  type="number"
                  value={newTxn.version}
                  onChange={(e) => setNewTxn({ ...newTxn, version: parseIntegerInput(e.target.value) })}
                  size="small"
                  variant="outlined"
                  placeholder="Version"
                  sx={{ width: 80 }}
                />
              </TableCell>
              <TableCell align="center">
                <TextField
                  type="text"
                  value={newTxn.securityCode}
                  onChange={(e) => setNewTxn({ ...newTxn, securityCode: e.target.value })}
                  size="small"
                  variant="outlined"
                  placeholder="Security"
                  sx={{ width: 100 }}
                />
              </TableCell>
              <TableCell align="center">
                <TextField
                  type="number"
                  value={newTxn.quantity}
                  onChange={(e) => setNewTxn({ ...newTxn, quantity: parseIntegerInput(e.target.value) })}
                  size="small"
                  variant="outlined"
                  placeholder="Qty"
                  sx={{ width: 80 }}
                />
              </TableCell>
              <TableCell align="center">
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={newTxn.action}
                    onChange={(e) => setNewTxn({ ...newTxn, action: e.target.value })}
                    variant="outlined"
                    displayEmpty
                  >
                    {ActionTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell align="center">
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={newTxn.direction}
                    onChange={(e) => setNewTxn({ ...newTxn, direction: e.target.value })}
                    variant="outlined"
                    displayEmpty
                  >
                    {Directions.map((dir) => (
                      <MenuItem key={dir} value={dir}>
                        {dir}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell align="center">
                <Button onClick={handleAdd} variant="contained" color="success" size="small">
                  Add
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TransactionTable;