package com.transaction.model.upload;

import com.transaction.model.UploadStatus;

public record UploadFailed(String uploadId, String fileName, UploadStatus uploadStatus, String message) implements UploadResult {
}
