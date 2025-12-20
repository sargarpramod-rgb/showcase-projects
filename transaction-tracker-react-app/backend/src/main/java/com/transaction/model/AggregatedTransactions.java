package com.transaction.model;

import lombok.Data;

import java.util.List;

@Data
public class AggregatedTransactions {

    String payee;
    Double totalAmount;
    int transactionCount;
    String category;
    String subcategory;
    List<EnhancedTransaction> enhancedTransactionList;
 }
