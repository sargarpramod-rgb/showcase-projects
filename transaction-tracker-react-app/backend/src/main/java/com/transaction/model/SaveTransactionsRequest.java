package com.transaction.model;

import java.util.List;

public record SaveTransactionsRequest(
        Long uploadId,
        List<AggregatedTransactions> aggregatedData
) {
}