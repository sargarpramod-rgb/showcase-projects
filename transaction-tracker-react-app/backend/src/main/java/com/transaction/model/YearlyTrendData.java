package com.transaction.model;

import lombok.Getter;
import lombok.Setter;
import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
public class YearlyTrendData implements Serializable {
    private static final long serialVersionUID = 1L;
    private int year;
    private BigDecimal income = BigDecimal.ZERO;
    private BigDecimal expenses = BigDecimal.ZERO;
    private BigDecimal investments = BigDecimal.ZERO;
    private BigDecimal netBalance = BigDecimal.ZERO;
    private long transactionCount;
    private long unclassifiedCount;
    private boolean partial;

    public YearlyTrendData() {}

    public YearlyTrendData(int year, BigDecimal income, BigDecimal expenses, BigDecimal investments) {
        this.year = year;
        this.income = income;
        this.expenses = expenses;
        this.investments = investments;
        this.netBalance = income.subtract(expenses).subtract(investments);
    }
}
