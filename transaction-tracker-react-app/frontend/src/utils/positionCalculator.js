// src/utils/positionCalculator.js

export function calculatePositions(transactions) {
  const tradeMap = new Map();

  for (const txn of transactions) {
    const existing = tradeMap.get(txn.tradeId);
    if (!existing || existing.version < txn.version) {
      tradeMap.set(txn.tradeId, txn);
    }
  }

  const positionMap = new Map();

  for (const [, txn] of tradeMap.entries()) {
    if (txn.action === "CANCEL") continue;

    const sign = txn.direction === "Buy" ? 1 : -1;
    const qty = sign * txn.quantity;
    const prev = positionMap.get(txn.securityCode) || 0;
    positionMap.set(txn.securityCode, prev + qty);
  }

  return Array.from(positionMap.entries()).map(([securityCode, netQuantity]) => ({
    securityCode,
    netQuantity,
  }));
}
