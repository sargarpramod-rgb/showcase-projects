package com.transaction.model;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class CategoryTrendData {
    private String month;
    private Long categoryId;
    private String category;
    private BigDecimal totalAmount;
    private BigDecimal previousMonthAmount;
    private BigDecimal absoluteChange;
    private BigDecimal percentageChange;
    private Long transactionCount;
}
