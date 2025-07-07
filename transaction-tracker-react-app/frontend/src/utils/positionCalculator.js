// src/utils/positionCalculator.js

export function calculatePositions(transactions) {
  const tradeMap = new Map(); // Stores the latest version of each trade

  // Step 1: Filter transactions to get the latest version for each tradeId
  for (const txn of transactions) {
    const existing = tradeMap.get(txn.tradeId);
    // Only store the transaction if it's new or has a higher version
    if (!existing || existing.version < txn.version) {
      tradeMap.set(txn.tradeId, txn);
    }
  }

  const positionMap = new Map(); // Stores the aggregated net quantity per securityCode

  // Step 2: Calculate positions based on the latest trade versions
  for (const [, txn] of tradeMap.entries()) {
    const prevQuantity = positionMap.get(txn.securityCode) || 0; // Get current quantity for security

    let quantityChange = 0;

    // If the action is 'CANCEL', the quantity for this security from this trade should be zeroed out.
    // This assumes a 'CANCEL' transaction effectively reverses the previous effect of that specific trade.
    // To implement this, we need to know the *original* quantity of the trade being cancelled.
    // However, the current structure only gives us the *final* state of the trade.
    // A more robust 'CANCEL' would typically require linking to the original 'INSERT' or 'UPDATE'.
    //
    // Given the prompt "update the logic for cancel to show 0 as value",
    // we'll interpret this as: if the *latest* version of a trade is 'CANCEL',
    // then that specific trade contributes 0 to the net quantity.
    // If the 'CANCEL' implies undoing a *previous* quantity, the logic would be more complex
    // requiring tracking historical states of each trade.
    //
    // For simplicity, based on "show 0 as value", we will simply make sure this cancelled
    // trade does not add its quantity to the running total. If a security's total
    // becomes 0 due to all its related trades being cancelled or netting out, that's the result.

    if (txn.action === "CANCEL") {
      quantityChange = 0;
    } else {
      const sign = txn.direction === "Buy" ? 1 : -1;
      quantityChange = sign * txn.quantity;
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