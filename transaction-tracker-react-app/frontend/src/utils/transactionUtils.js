export function aggregateTransactions(data,filterText,showUncategorized,showIncome) {

 let smallTransactionsCount = 0;
       let smallTransactionsTotal = 0;
       let smallTransactions = [];

       let aggregatedData = Object.entries(data).reduce((acc, [payee, transactions]) => {

         const filteredTransactions = transactions.filter(txn => Math.abs(txn.amount) >= 50)


         const smallTxns = transactions.filter(txn => Math.abs(txn.amount) < 50);

         if (smallTxns.length > 0) {
           smallTransactionsCount += smallTxns.length;
           smallTransactionsTotal += smallTxns.reduce((sum, txn) => sum + txn.amount, 0);
           smallTransactions = [...smallTransactions, ...smallTxns];
         }

         if (filteredTransactions.length > 0) {
           const totalAmount = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
           acc.push({
             payee,
             totalAmount,
             payeeFullName : filteredTransactions[0].payeeFullName,
             transactionCount: filteredTransactions.length,
             transactions: filteredTransactions,
             category: filteredTransactions[0].category,
             subcategory: filteredTransactions[0].subcategory
           });
         }

         return acc;
       }, []);

       if (smallTransactionsCount > 0) {
         aggregatedData.push({
           payee: "Small Transactions",
           totalAmount: smallTransactionsTotal,
           transactionCount: smallTransactionsCount,
           transactions: smallTransactions
         });
       }

    console.log("original aggregatedData"+JSON.stringify(aggregatedData, null, 2))

      const filteredData = aggregatedData.filter(item => {
        if (!filterText) return true;
        return (
          item.payee?.trim().toLowerCase().includes(filterText.toLowerCase()) ||
          item.category?.trim().toLowerCase().includes(filterText.toLowerCase()) ||
          item.subcategory?.trim().toLowerCase().includes(filterText.toLowerCase())
        );
      });

      aggregatedData = filteredData
        .map(item => {
          // safeguard for missing transactions
          const txns = Array.isArray(item.transactions) ? item.transactions : [];

          const filteredTxns = showUncategorized
            ? txns.filter(txn => !txn.category || !txn.subcategory) // only uncategorized
            : showIncome ? txns.filter(txn => txn.amount > 0) : txns;                             // all transactions

          return {
            ...item,
            transactions: filteredTxns,
            transactionCount: filteredTxns.length,
            totalAmount: filteredTxns.reduce((sum, txn) => sum + txn.amount, 0)
          };
        })
        .filter(item => item.transactions.length > 0);

        return aggregatedData;
}