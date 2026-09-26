package com.transaction.model;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Upload {

    private Long uploadId;
    private Long userId;
    private String fileName;
    private String fileHash;
    private UploadStatus status;

    private Instant createdAt;
    private Instant updatedAt;
}