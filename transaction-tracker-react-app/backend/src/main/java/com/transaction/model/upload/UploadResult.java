package com.transaction.model.upload;

public sealed interface UploadResult permits UploadCompleted, UploadFailed, UploadPartiallyCompleted {
}
