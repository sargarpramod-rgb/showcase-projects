package com.transaction.model.upload;

import com.transaction.model.EnhancedTransaction;
import com.transaction.model.UploadStatus;

import java.util.List;

public record UploadCompleted(String uploadId, String fileName, UploadStatus  uploadStatus, List<EnhancedTransaction> transactions) implements UploadResult {
}
