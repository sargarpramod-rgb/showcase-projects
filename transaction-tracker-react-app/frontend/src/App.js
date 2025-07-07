// src/App.js

import React, { useState } from "react";
import TransactionTable from "./components/TransactionTable";
import PositionTable from "./components/PositionTable";
import { calculatePositions } from "./utils/positionCalculator";

const App = () => {
  const [transactions, setTransactions] = useState([
    { transactionId: 1, tradeId: 1, version: 1, securityCode: "REL", quantity: 50, action: "INSERT", direction: "Buy" },
    { transactionId: 2, tradeId: 2, version: 1, securityCode: "ITC", quantity: 40, action: "INSERT", direction: "Sell" },
    { transactionId: 3, tradeId: 3, version: 1, securityCode: "INF", quantity: 70, action: "INSERT", direction: "Buy" },
    { transactionId: 4, tradeId: 1, version: 2, securityCode: "REL", quantity: 60, action: "UPDATE", direction: "Buy" },
    { transactionId: 5, tradeId: 2, version: 2, securityCode: "ITC", quantity: 30, action: "CANCEL", direction: "Buy" },
    { transactionId: 6, tradeId: 4, version: 1, securityCode: "INF", quantity: 20, action: "INSERT", direction: "Sell" }
  ]);

  const positions = calculatePositions(transactions);

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
