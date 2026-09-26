package com.transaction.upload.strategy.pdf.bank;

import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.EnhancedTransaction;
import com.transaction.upload.strategy.pdf.BankStatementParser;
import lombok.extern.log4j.Log4j2;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// --- Fallback for banks without a dedicated parser ---
@Component
@Log4j2
public class GenericHeuristicBankStatementParser implements BankStatementParser {

    // Loose pattern: any date, then text, then a decimal amount somewhere on the line
    private static final Pattern LOOSE_TXN_LINE = Pattern.compile(
        "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})\\s+(.+?)\\s+([\\d,]+\\.\\d{2})"
    );

    @Override
    public boolean canParse(String text) {
        return false; // always matches — it's the last resort
    }

    @Override
    public List<EnhancedTransaction> parse(PDDocument document) throws IOException {
        return null;
    }



    @Override
    public String bankName() {
        return "UNKNOWN";
    }

    private LocalDate parseFlexibleDate(String raw) {
        // try a few common formats
        for (String pattern : List.of("dd/MM/yyyy", "dd-MM-yyyy", "dd/MM/yy", "MM/dd/yyyy")) {
            try {
                return LocalDate.parse(raw, DateTimeFormatter.ofPattern(pattern));
            } catch (DateTimeParseException ignored) {}
        }
        throw new IllegalArgumentException("Unparseable date: " + raw);
    }
}