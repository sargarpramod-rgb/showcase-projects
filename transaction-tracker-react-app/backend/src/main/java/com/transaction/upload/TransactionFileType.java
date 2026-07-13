package com.transaction.upload;

import java.util.Optional;

public enum TransactionFileType {
    QIF, OFX, CSV_GENERIC,PDF; // extend as you add formats

    public static Optional<TransactionFileType> fromFilename(String filename) {
        if (filename == null) return Optional.empty();
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        return switch (ext) {
            case "qif" -> Optional.of(QIF);
            case "ofx", "qfx" -> Optional.of(OFX);
            case "csv" -> Optional.of(CSV_GENERIC);
            case "pdf" -> Optional.of(PDF);
            default -> Optional.empty();
        };
    }
}