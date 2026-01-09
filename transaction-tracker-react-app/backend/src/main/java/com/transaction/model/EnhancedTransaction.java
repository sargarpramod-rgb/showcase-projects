package com.transaction.model;

import lombok.Data;

@Data
public class EnhancedTransaction {

    String transactionId;
    String date;
    String payee;
    Double amount;
    String payeeFullName;
    String category;
    String subcategory;
    String txnType;
}
