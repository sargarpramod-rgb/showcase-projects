package com.transaction.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class AggregatedTransactions {

    String payee;
    Double totalAmount;
    int transactionCount;
    String category;
    String subcategory;
    @JsonProperty("transactions")
    List<EnhancedTransaction> enhancedTransactionList;
 }
