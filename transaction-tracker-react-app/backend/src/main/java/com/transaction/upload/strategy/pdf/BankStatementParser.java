package com.transaction.upload.strategy.pdf;

import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.EnhancedTransaction;
import org.apache.pdfbox.pdmodel.PDDocument;

import java.io.IOException;
import java.util.List;

// --- Bank-specific parser interface ---
public interface BankStatementParser {

    /** Cheap text-based check: does this look like this bank's statement? */
    boolean canParse(String extractedText);

    /** Parse already-extracted PDF text into transactions. */
    List<EnhancedTransaction> parse(PDDocument document) throws IOException;

    /** Used for logging/diagnostics/ordering. */
    String bankName();
}