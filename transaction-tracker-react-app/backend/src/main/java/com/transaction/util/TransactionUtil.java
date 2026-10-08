package com.transaction.util;

import com.transaction.model.EnhancedTransaction;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toMap;

public class TransactionUtil {

    public static void setPayeeDetails(EnhancedTransaction enhancedTransaction,String payeeName) {
        enhancedTransaction.setPayeeFullName(payeeName.contains("-") &&
                payeeName.contains("@") ? payeeName.substring(payeeName.indexOf("-") + 1, payeeName.indexOf("@"))
                : payeeName);
        enhancedTransaction.setPayee(payeeName.contains("-") ? payeeName.split("-")[1].trim() : payeeName.trim());
    }

    public static LocalDate getTransactionLocalDate(String dateString){

        // Remove "TXN TIME " and get only the date part
        String datePart = dateString.split(" TXN TIME ")[0];
        LocalDate localDate = null;
        // Define possible formatters
        List<DateTimeFormatter> formatters = Arrays.asList(
                DateTimeFormatter.ofPattern("MM-dd-yyyy"), // e.g. 07-01-2025
                DateTimeFormatter.ofPattern("dd/MM/yy"),    // e.g. 01/06/25
                DateTimeFormatter.ofPattern("yyyy-MM-dd")
        );

        for (DateTimeFormatter formatter : formatters) {
            try {
                localDate = LocalDate.parse(datePart, formatter);
            } catch (DateTimeParseException e) {
                // try next formatter
            }
        }

        return localDate;
    }
}
