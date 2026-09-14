package com.transaction.model;

import lombok.Getter;
import lombok.Setter;
import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
public class MonthlyTrendData implements Serializable {
    private static final long serialVersionUID = 1L;
    private String month;
    private int year;
    private BigDecimal income = BigDecimal.ZERO;
    private BigDecimal expenses = BigDecimal.ZERO;
    private BigDecimal investments = BigDecimal.ZERO;
    private BigDecimal netBalance = BigDecimal.ZERO;
    private BigDecimal previousMonthAmount;
    private BigDecimal absoluteChange;
    private BigDecimal percentageChange;
    private long transactionCount;
    private long unclassifiedCount;
    private boolean partial;

    public MonthlyTrendData() {}

    public MonthlyTrendData(String month, int year, BigDecimal income,
                            BigDecimal expenses, BigDecimal investments) {
        this.month = month;
        this.year = year;
        this.income = income;
        this.expenses = expenses;
        this.investments = investments;
        this.netBalance = income.subtract(expenses).subtract(investments);
    }
}
