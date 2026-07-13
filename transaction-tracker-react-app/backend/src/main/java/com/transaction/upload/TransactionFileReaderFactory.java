package com.transaction.upload;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

// --- Factory ---
@Component
public class TransactionFileReaderFactory {

    private final List<TransactionFileReaderStrategy> strategies;

    public TransactionFileReaderFactory(List<TransactionFileReaderStrategy> strategies) {
        this.strategies = strategies;
    }

    public TransactionFileReaderStrategy getStrategy(TransactionFileType type) throws UnsupportedFileTypeException {
        return strategies.stream()
                .filter(s -> s.supports(type))
                .findFirst()
                .orElseThrow(() -> new UnsupportedFileTypeException("No reader found for file type: " + type));
    }

    /** Resolve type from filename, falling back to an explicit hint if extension is missing/ambiguous. */
    public TransactionFileType resolveType(MultipartFile file, TransactionFileType hint) {
        return TransactionFileType.fromFilename(file.getOriginalFilename())
                .orElse(hint);
    }
}