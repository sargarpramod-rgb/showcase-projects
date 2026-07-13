package com.transaction.upload.strategy.pdf;

import com.github.fracpete.quicken4j.Transactions;
import com.transaction.upload.TransactionFileReaderStrategy;
import com.transaction.upload.TransactionFileType;
import com.transaction.upload.strategy.pdf.bank.HdfcBankStatementParser;
import com.transaction.upload.strategy.pdf.bank.HdfcBankStatementParserOld;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

// --- PDF reading strategy (top-level, plugs into your existing factory) ---
@Component
public class PdfTransactionFileReaderStrategy implements TransactionFileReaderStrategy {

    private final BankStatementParserFactory bankParserFactory;

    public PdfTransactionFileReaderStrategy(BankStatementParserFactory bankParserFactory) {
        this.bankParserFactory = bankParserFactory;
    }

    // temp. code to test pdf reading.
    public static void main(String[] args) throws IOException {
        PdfTransactionFileReaderStrategy pdfTransactionFileReaderStrategy
                = new PdfTransactionFileReaderStrategy(new BankStatementParserFactory(List.of(new HdfcBankStatementParser()),null));

        try (InputStream inputStream = Files.newInputStream(Path.of("C:\\Pramod\\Transactions\\Acct_Statement_XXXXXXXX4904_02072026_without_password.pdf"))) {

            pdfTransactionFileReaderStrategy.read(inputStream);

        } catch (IOException e) {
            System.err.println("Error reading PDF file: " + e.getMessage());
        }

        //pdfTransactionFileReaderStrategy.read(PdfTransactionFileReaderStrategy.class.getResourceAsStream("Sample_transactions.pdf"));
    }

    @Override
    public Transactions read(InputStream inputStream) throws IOException {
        byte[] bytes = inputStream.readAllBytes();

        try (PDDocument document = Loader.loadPDF(bytes)) {
            String sampleText = extractSampleText(document);
            BankStatementParser parser = bankParserFactory.resolve(sampleText);
            return parser.parse(document);
        }
    }

    @Override
    public boolean supports(TransactionFileType type) {
        return type == TransactionFileType.PDF;
    }

    /** Cheap plain-text extraction of just the first page or two, used only for bank identification. */
    private String extractSampleText(PDDocument document) throws IOException {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setStartPage(1);
        stripper.setEndPage(Math.min(2, document.getNumberOfPages()));
        return stripper.getText(document);
    }
}