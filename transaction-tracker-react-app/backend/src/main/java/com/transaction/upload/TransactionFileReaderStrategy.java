package com.transaction.upload;

import com.github.fracpete.quicken4j.Transactions;

import java.io.IOException;
import java.io.InputStream;

public interface TransactionFileReaderStrategy {
    Transactions read(InputStream inputStream) throws IOException;
    boolean supports(TransactionFileType type);
}