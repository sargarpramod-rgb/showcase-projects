package com.transaction.upload;

import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.EnhancedTransaction;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface TransactionFileReaderStrategy {
    List<EnhancedTransaction> read(InputStream inputStream) throws IOException;
    boolean supports(TransactionFileType type);
}