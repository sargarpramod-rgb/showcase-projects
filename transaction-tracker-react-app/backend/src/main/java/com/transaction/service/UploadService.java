package com.transaction.service;

import com.transaction.model.Upload;
import com.transaction.upload.db.UploadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UploadService {

    private final UploadRepository uploadRepository;

    public Upload getOrCreateUpload(Long userId, String fileName, String fileHash) {

        Optional<Upload> existing =
                uploadRepository.findByUserIdAndFileHash(userId, fileHash);

        if (existing.isPresent()) {
            return existing.get();
        }

        Upload upload = Upload.builder()
                .userId(userId)
                .fileName(fileName)
                .fileHash(fileHash)
                .status("PREVIEW")
                .build();

        return uploadRepository.save(upload);
    }

    public boolean shouldReuseFromDb(Upload upload) {
        return "SUCCESS".equals(upload.getStatus());
    }

    public void markSuccess(Long uploadId) {
        uploadRepository.updateStatus(uploadId, "SUCCESS");
    }

    public void markFailed(Long uploadId) {
        uploadRepository.updateStatus(uploadId, "FAILED");
    }
}