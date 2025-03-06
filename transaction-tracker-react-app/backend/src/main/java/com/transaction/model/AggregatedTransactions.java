package com.transaction.model;

import java.util.List;

public class AggregatedTransactions {

    String payee;
    Double totalAmount;
    int transactionCount;
    String category;
    String subcategory;

    List<EnhancedTransaction> enhancedTransactionList;

    public String getPayee() {
        return payee;
    }

    public void setPayee(String payee) {
        this.payee = payee;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public int getTransactionCount() {
        return transactionCount;
    }

    public void setTransactionCount(int transactionCount) {
        this.transactionCount = transactionCount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSubcategory() {
        return subcategory;
    }

    public void setSubcategory(String subcategory) {
        this.subcategory = subcategory;
    }

    public List<EnhancedTransaction> getEnhancedTransactionList() {
        return enhancedTransactionList;
    }

    public void setEnhancedTransactionList(List<EnhancedTransaction> enhancedTransactionList) {
        this.enhancedTransactionList = enhancedTransactionList;
    }
}
