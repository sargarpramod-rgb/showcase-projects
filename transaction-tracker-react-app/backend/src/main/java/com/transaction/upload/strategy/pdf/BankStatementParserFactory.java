package com.transaction.upload.strategy.pdf;

import com.transaction.upload.strategy.pdf.bank.GenericHeuristicBankStatementParser;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

import java.util.List;

// --- Factory that picks the right bank parser ---
@Component
@Log4j2
public class BankStatementParserFactory {

    private final List<BankStatementParser> parsers;
    private final GenericHeuristicBankStatementParser fallbackParser;

    public BankStatementParserFactory(List<BankStatementParser> parsers,
                                       GenericHeuristicBankStatementParser fallbackParser) {
        this.parsers = parsers;
        this.fallbackParser = fallbackParser;
    }

    public BankStatementParser resolve(String extractedText) {
        return parsers.stream()
                .filter(p -> p.canParse(extractedText))
                .findFirst()
                .orElseGet(() -> {
                    log.warn("No dedicated parser matched; falling back to heuristic parser");
                    return fallbackParser;
                });
    }
}