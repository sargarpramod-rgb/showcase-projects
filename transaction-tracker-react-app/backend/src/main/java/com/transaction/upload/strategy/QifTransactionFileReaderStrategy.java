package com.transaction.upload.strategy;

import com.github.fracpete.quicken4j.QIFReader;
import com.github.fracpete.quicken4j.Transactions;
import com.transaction.upload.TransactionFileReaderStrategy;
import com.transaction.upload.TransactionFileType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

@Component
public class QifTransactionFileReaderStrategy implements TransactionFileReaderStrategy {

    @Override
    public Transactions read(InputStream inputStream) throws IOException {
        return new QIFReader().read(inputStream);
    }

    @Override
    public boolean supports(TransactionFileType type) {
        return type == TransactionFileType.QIF;
    }
}