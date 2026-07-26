package com.transaction.util;

import com.transaction.model.EnhancedTransaction;

public class TransactionUtil {

    public static void setPayeeDetails(EnhancedTransaction enhancedTransaction,String payeeName) {
        enhancedTransaction.setPayeeFullName(payeeName.contains("-") &&
                payeeName.contains("@") ? payeeName.substring(payeeName.indexOf("-") + 1, payeeName.indexOf("@"))
                : payeeName);
        enhancedTransaction.setPayee(payeeName.contains("-") ? payeeName.split("-")[1].trim() : payeeName.trim());
    }
}
