// src/App.js

import React, { useState,useMemo } from "react";
import TransactionTable from "./components/TransactionTable";
import PositionTable from "./components/PositionTable";
import { calculatePositions } from "./utils/positionCalculator";

export const isTransactionValid = (newTxn, transactions) => {
  const tradeTxns = transactions.filter(t => t.tradeId === newTxn.tradeId);

  console.log("newTxn = " + newTxn.quantity)

  if (tradeTxns.length === 0 && newTxn.action !== "INSERT") {
    alert("First version must be an INSERT");
    return false;
  }

  if (newTxn.quantity === 0) {
      alert("Quantity can not be zero");
      return false;
    }

  if (!newTxn.securityCode.trim()) {
        alert("Security Code cannot be blank.");
        return false;
      }

  if (newTxn.tradeId === 0) {
        alert("Trade Id can not be zero");
        return false;
      }

  const existingVersions = tradeTxns.map(t => t.version);
  if (existingVersions.includes(newTxn.version)) {
    alert("Version already exists for this Trade ID");
    return false;
  }

  if (tradeTxns.some(t => t.action === "CANCEL")) {
    alert("Cannot modify a cancelled trade");
    return false;
  }

  if (newTxn.action === "INSERT" && newTxn.version !== 1) {
    alert("INSERT must be version 1");
    return false;
  }

  return true;
};


const App = () => {
  const [transactions, setTransactions] = useState([
    { transactionId: 1, tradeId: 1, version: 1, securityCode: "REL", quantity: 50, action: "INSERT", direction: "Buy" },
    { transactionId: 2, tradeId: 2, version: 1, securityCode: "ITC", quantity: 40, action: "INSERT", direction: "Sell" },
    { transactionId: 3, tradeId: 3, version: 1, securityCode: "INF", quantity: 70, action: "INSERT", direction: "Buy" },
    { transactionId: 4, tradeId: 1, version: 2, securityCode: "REL", quantity: 60, action: "UPDATE", direction: "Buy" },
    { transactionId: 5, tradeId: 2, version: 2, securityCode: "ITC", quantity: 30, action: "CANCEL", direction: "Buy" },
    { transactionId: 6, tradeId: 4, version: 1, securityCode: "INF", quantity: 20, action: "INSERT", direction: "Sell" }
  ]);

  // 👇 This will recalculate positions every time transactions change
  const positions = useMemo(() => calculatePositions(transactions), [transactions]);

  return (
    <div className="container mx-auto p-4">
      <TransactionTable
        initialTransactions={transactions}
        onTransactionsChange={setTransactions}
      />
      <PositionTable positions={positions} />
    </div>
  );
};


export default App;
