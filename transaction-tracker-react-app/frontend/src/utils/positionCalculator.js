export function calculatePositions(transactions) {
  const tradeMap = new Map(); // Stores the latest version of each trade

  for (const txn of transactions) {
    const existing = tradeMap.get(txn.tradeId);
    // Only store the transaction if it's new or has a higher version
    if (!existing || existing.version < txn.version) {
      tradeMap.set(txn.tradeId, txn);
    }
  }

  const positionMap = new Map();

  for (const [, txn] of tradeMap.entries()) {
    const prevQuantity = positionMap.get(txn.securityCode) || 0; // Get current quantity for security

    console.log("txn.securityCode = " + txn.securityCode)
    console.log("prevQuantity = "+prevQuantity)
    let quantityChange = 0;

    if (txn.action === "CANCEL") {
      quantityChange = 0;
    } else {
      const sign = txn.direction === "Buy" ? 1 : -1;
      console.log("sign = "+sign)
      quantityChange = sign * txn.quantity;
      console.log("quantityChange = "+quantityChange)
      console.log("final quantity = "+(prevQuantity + quantityChange))
    }

    // Update the position for the security code
    positionMap.set(txn.securityCode, prevQuantity + quantityChange);
  }

  // Step 3: Convert the map into an array of position objects
  return Array.from(positionMap.entries()).map(([securityCode, netQuantity]) => ({
    securityCode,
    netQuantity,
  }));
}