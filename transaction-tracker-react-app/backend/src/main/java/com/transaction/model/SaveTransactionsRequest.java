package com.transaction.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record SaveTransactionsRequest(
        Long uploadId,
        @JsonProperty("transactions")
        List<EnhancedTransaction> transactions
) {
}