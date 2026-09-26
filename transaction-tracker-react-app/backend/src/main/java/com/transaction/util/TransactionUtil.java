package com.transaction.util;

import com.transaction.model.EnhancedTransaction;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toMap;

public class TransactionUtil {

    public static void setPayeeDetails(EnhancedTransaction enhancedTransaction,String payeeName) {
        enhancedTransaction.setPayeeFullName(payeeName.contains("-") &&
                payeeName.contains("@") ? payeeName.substring(payeeName.indexOf("-") + 1, payeeName.indexOf("@"))
                : payeeName);
        enhancedTransaction.setPayee(payeeName.contains("-") ? payeeName.split("-")[1].trim() : payeeName.trim());
    }

    //TODO: Move this logic to UI.
    public static LinkedHashMap<String, List<EnhancedTransaction>> getTransactionsByPayeeSortedByAmount(List<EnhancedTransaction> enhancedTransactionList) {

        Map<String, List<EnhancedTransaction>> transactionData = enhancedTransactionList.stream().collect(Collectors.groupingBy(EnhancedTransaction::getPayee));
        LinkedHashMap<String, List<EnhancedTransaction>> transactionMap = transactionData.entrySet().stream()
                .sorted(Comparator.comparingDouble(e -> e.getValue().stream().mapToDouble(EnhancedTransaction::getAmount).sum()))
                .collect(toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        LinkedHashMap::new // Preserve sorted order
                ));
        return transactionMap;
    }
}
