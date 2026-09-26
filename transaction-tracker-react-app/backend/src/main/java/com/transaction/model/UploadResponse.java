package com.transaction.model;

import org.springframework.http.HttpStatusCode;

import java.util.List;

public record UploadResponse(
        Long uploadId,
        String fileName,
        UploadStatus status,
        List<EnhancedTransaction> transactions

) {
}