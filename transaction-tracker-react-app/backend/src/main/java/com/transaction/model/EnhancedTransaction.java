package com.transaction.model;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class EnhancedTransaction {

    String transactionId;
    String date;
    String payee;
    BigDecimal amount;
    String payeeFullName;
    Long category;
    Long subcategory;
    String txnType;
}
