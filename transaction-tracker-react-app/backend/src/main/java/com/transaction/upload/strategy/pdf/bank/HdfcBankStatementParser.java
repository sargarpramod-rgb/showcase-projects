package com.transaction.upload.strategy.pdf.bank;


import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.EnhancedTransaction;
import com.transaction.upload.strategy.pdf.BankStatementParser;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class HdfcBankStatementParser implements BankStatementParser {

    private static final Logger log = LoggerFactory.getLogger(HdfcBankStatementParser.class);

    // --- Column X-boundaries ---
    // TODO: verify/replace using PdfColumnDiagnostic against your real HDFC PDF.
    private static final float DATE_X_START  = 30,  DATE_X_END  = 60;
    private static final float NARR_X_START  = 70,  NARR_X_END  = 360;
    private static final float WITH_X_START  = 480, WITH_X_END  = 530;
    private static final float DEP_X_START   = 530, DEP_X_END   = 600;
    private static final float BAL_X_START   = 600, BAL_X_END   = 680;

    // How close in Y two text runs need to be to be considered "the same visual row".
    private static final float ROW_Y_TOLERANCE = 3.0f;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yy");
    private static final Pattern DATE_PATTERN = Pattern.compile("\\d{2}/\\d{2}/\\d{2}");

    private static final String STATEMENT_LINE_ANCHOR = "Statement of account";
    private static final String COLUMN_HEADER_ANCHOR   = "Withdrawal Amt";
    private static final String FOOTER_ANCHOR          = "Closing balance includes funds earmarked";

    @Override
    public boolean canParse(String plainTextSample) {
        String normalized = plainTextSample.replaceAll("\\s+", " ").toUpperCase();
        return normalized.contains("HDFC BANK") && normalized.contains("STATEMENT OF ACCOUNT");
    }

    @Override
    public Transactions parse(PDDocument document) throws IOException {
        List<EnhancedTransaction> results = new ArrayList<>();

        List<PDPage> pages = new ArrayList<>();
        document.getPages().forEach(pages::add);

        // Accumulator lives OUTSIDE the page loop: a transaction's wrapped narration
        // can legitimately continue onto the top of the next page, so state must
        // survive page boundaries and only be flushed when the *next date* appears
        // (or at the very end of the document).
        TransactionAccumulator accumulator = new TransactionAccumulator();

        for (int pageIndex = 0; pageIndex < pages.size(); pageIndex++) {
            PDPage page = pages.get(pageIndex);

            float statementLineY = findTextY(document, pageIndex, STATEMENT_LINE_ANCHOR);
            if (statementLineY < 0) {
                log.debug("Page {} has no '{}' anchor — skipping", pageIndex + 1, STATEMENT_LINE_ANCHOR);
                continue;
            }

            // Column header row only exists on page 1; later pages: table starts right after statement line
            float columnHeaderY = findTextY(document, pageIndex, COLUMN_HEADER_ANCHOR);
            float tableStartY = Math.max(columnHeaderY, statementLineY);

            float footerY = findTextY(document, pageIndex, FOOTER_ANCHOR);
            float tableEndY = footerY > 0 ? footerY : page.getMediaBox().getHeight();

            if (tableEndY <= tableStartY) {
                log.warn("Page {} table end ({}) <= table start ({}); skipping page", pageIndex + 1, tableEndY, tableStartY);
                continue;
            }

            RowExtractor extractor = new RowExtractor(tableStartY, tableEndY);
            extractor.setStartPage(pageIndex + 1);
            extractor.setEndPage(pageIndex + 1);
            extractor.getText(document);

            List<Row> rows = extractor.buildRows();

            int before = results.size();
            accumulator.consume(rows, results);

            if (results.size() == before && rows.stream().noneMatch(r -> !r.dateText.isEmpty())) {
                log.warn("Page {} produced zero transactions — possible template drift or coordinate mismatch", pageIndex + 1);
            }
        }

        // Whatever transaction was still open when the document ended needs to be flushed.
        accumulator.flush(results);

        //return new Transactions(results);
        return null;
    }

    @Override
    public String bankName() {
        return "HDFC";
    }

    // ---------- table boundary detection ----------

    private float findTextY(PDDocument document, int pageIndex, String targetText) throws IOException {
        HeaderPositionFinder finder = new HeaderPositionFinder(targetText);
        finder.setStartPage(pageIndex + 1);
        finder.setEndPage(pageIndex + 1);
        finder.getText(document);
        return finder.resolveY();
    }

    /** Accumulates all text runs on a page (with per-character Y tracking) so multi-run phrases can be matched. */
    private static class HeaderPositionFinder extends PDFTextStripper {
        private final String targetText;
        private final StringBuilder buffer = new StringBuilder();
        private final List<Float> yPerCharIndex = new ArrayList<>();

        HeaderPositionFinder(String targetText) throws IOException {
            this.targetText = targetText.replaceAll("\\s+", " ").toLowerCase();
            this.setSortByPosition(true);
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) throws IOException {
            if (!positions.isEmpty()) {
                float y = positions.get(0).getYDirAdj();
                for (int i = 0; i < text.length(); i++) {
                    yPerCharIndex.add(y);
                }
                buffer.append(text);
            }
            buffer.append(' ');
            yPerCharIndex.add(yPerCharIndex.isEmpty() ? 0f : yPerCharIndex.get(yPerCharIndex.size() - 1));
            super.writeString(text, positions);
        }

        float resolveY() {
            String normalized = buffer.toString().replaceAll("\\s+", " ").toLowerCase();
            int idx = normalized.indexOf(targetText);
            if (idx < 0 || idx >= yPerCharIndex.size()) {
                return -1;
            }
            return yPerCharIndex.get(idx) + 2; // small buffer past the line
        }
    }

    // ---------- column classification ----------

    private enum Column { DATE, NARRATION, WITHDRAWAL, DEPOSIT, BALANCE }

    /**
     * Classifies an X coordinate into one of the five table columns. Falls back to the
     * nearest column (by center distance) if the text slightly overshoots the configured
     * boundaries, since real PDFs rarely line up to the pixel with the TODO'd constants above.
     */
    private static Column classify(float x) {
        if (x >= DATE_X_START && x < DATE_X_END) return Column.DATE;
        if (x >= NARR_X_START && x < NARR_X_END) return Column.NARRATION;
        if (x >= WITH_X_START && x < WITH_X_END) return Column.WITHDRAWAL;
        if (x >= DEP_X_START && x < DEP_X_END) return Column.DEPOSIT;
        if (x >= BAL_X_START && x < BAL_X_END) return Column.BALANCE;

        float[][] ranges = {
                {DATE_X_START, DATE_X_END},
                {NARR_X_START, NARR_X_END},
                {WITH_X_START, WITH_X_END},
                {DEP_X_START, DEP_X_END},
                {BAL_X_START, BAL_X_END}
        };
        Column[] cols = {Column.DATE, Column.NARRATION, Column.WITHDRAWAL, Column.DEPOSIT, Column.BALANCE};
        Column best = Column.NARRATION;
        float bestDist = Float.MAX_VALUE;
        for (int i = 0; i < ranges.length; i++) {
            float center = (ranges[i][0] + ranges[i][1]) / 2f;
            float dist = Math.abs(x - center);
            if (dist < bestDist) {
                bestDist = dist;
                best = cols[i];
            }
        }
        return best;
    }

    // ---------- horizontal row model ----------

    /**
     * A contiguous run of characters on a row with no significant horizontal gap between
     * them — i.e. one "word" or one number, kept together as an atomic unit. Classifying
     * whole tokens (rather than individual characters) into a column is what stops a single
     * amount from getting sliced in half across a column boundary.
     */
    private static class Token {
        private final StringBuilder text = new StringBuilder();
        private float minX = Float.MAX_VALUE;
        private float maxX = -Float.MAX_VALUE;

        void add(TextPosition tp) {
            text.append(tp.getUnicode());
            float x = tp.getXDirAdj();
            float endX = x + tp.getWidthDirAdj();
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, endX);
        }

        float centerX() {
            return (minX + maxX) / 2f;
        }

        String text() {
            return text.toString();
        }
    }

    /** One visual row on the page, holding the raw characters captured at that Y until tokenized. */
    private static class Row {
        final float y;
        final List<TextPosition> chars = new ArrayList<>();

        String dateText = "", narrationText = "", withdrawalText = "", depositText = "", balanceText = "";

        Row(float y) {
            this.y = y;
        }

        void add(TextPosition tp) {
            chars.add(tp);
        }

        void finalizeRow() {
            chars.sort(Comparator.comparing(TextPosition::getXDirAdj));

            List<Token> tokens = groupIntoTokens(chars);

            Map<Column, StringBuilder> byColumn = new EnumMap<>(Column.class);
            for (Column c : Column.values()) {
                byColumn.put(c, new StringBuilder());
            }

            // Each token is assigned to exactly ONE column, based on the token's horizontal
            // center. A blank column simply gets no tokens — it can no longer "steal"
            // characters from a neighbor, because tokens are never split mid-word/mid-number.
            for (Token t : tokens) {
                Column col = classify(t.centerX());
                StringBuilder sb = byColumn.get(col);
                if (sb.length() > 0) {
                    sb.append(' ');
                }
                sb.append(t.text());
            }

            dateText = byColumn.get(Column.DATE).toString().trim();
            narrationText = byColumn.get(Column.NARRATION).toString().trim();
            withdrawalText = byColumn.get(Column.WITHDRAWAL).toString().trim();
            depositText = byColumn.get(Column.DEPOSIT).toString().trim();
            balanceText = byColumn.get(Column.BALANCE).toString().trim();
        }

        private static List<Token> groupIntoTokens(List<TextPosition> sortedChars) {
            List<Token> tokens = new ArrayList<>();
            Token current = null;
            Float prevEndX = null;

            for (TextPosition tp : sortedChars) {
                float x = tp.getXDirAdj();
                float gapThreshold = Math.max(tp.getWidthDirAdj(), 2f) * 1.5f;
                boolean startsNewToken = current == null || prevEndX == null || (x - prevEndX) > gapThreshold;

                if (startsNewToken) {
                    current = new Token();
                    tokens.add(current);
                }
                current.add(tp);
                prevEndX = x + tp.getWidthDirAdj();
            }
            return tokens;
        }
    }

    /**
     * Extracts every character in the table region and groups characters that sit on the
     * same visual line (within {@link #ROW_Y_TOLERANCE}) into a {@link Row}. Column
     * classification is deferred to {@link Row#finalizeRow()}, which works on whole tokens
     * rather than individual characters.
     */
    private static class RowExtractor extends PDFTextStripper {
        private final float minY, maxY;
        private final List<Row> rows = new ArrayList<>();

        RowExtractor(float minY, float maxY) throws IOException {
            this.minY = minY;
            this.maxY = maxY;
            setSortByPosition(true);
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) throws IOException {
            for (TextPosition tp : positions) {
                float y = tp.getYDirAdj();
                if (y < minY || y > maxY) {
                    continue;
                }
                rowForY(y).add(tp);
            }
            super.writeString(text, positions);
        }

        private Row rowForY(float y) {
            for (Row r : rows) {
                if (Math.abs(r.y - y) <= ROW_Y_TOLERANCE) {
                    return r;
                }
            }
            Row r = new Row(y);
            rows.add(r);
            return r;
        }

        List<Row> buildRows() {
            // setSortByPosition(true) already delivers text top-to-bottom, so rows are
            // created in that order; sort defensively in case a wrapped run arrives out of order.
            rows.sort((a, b) -> Float.compare(a.y, b.y));
            for (Row r : rows) {
                r.finalizeRow();
            }
            return rows;
        }
    }

    // ---------- transaction assembly ----------

    /**
     * Walks rows top-to-bottom. A row whose DATE column matches a date is, by definition,
     * the start of a new transaction — so it both closes out (flushes) whatever transaction
     * was previously open and opens a new one. Any row without a date is a wrapped
     * continuation line and gets folded into the currently-open transaction's narration.
     */
    private static class TransactionAccumulator {
        private LocalDate pendingDate;
        private String pendingNarration;
        private BigDecimal pendingAmount;
        private BigDecimal previousBalance;
        private String pendingTransactionId;
        private String txnType;

        void consume(List<Row> rows, List<EnhancedTransaction> results) {
            for (Row row : rows) {
                Matcher dateMatcher = DATE_PATTERN.matcher(row.dateText);

                if (!row.dateText.isEmpty() && dateMatcher.find()) {
                    // New transaction detected — close out the previous one first.
                    flush(results);

                    LocalDate parsedDate;
                    try {
                        parsedDate = LocalDate.parse(dateMatcher.group(), DATE_FMT);
                    } catch (Exception e) {
                        pendingDate = null;
                        continue;
                    }

                    pendingTransactionId = row.narrationText.substring(row.narrationText.length() - 17).trim();

                    pendingDate = parsedDate;
                    pendingNarration = row.narrationText.substring(0,row.narrationText.length() - 17);


                    if (!row.withdrawalText.isEmpty()) {
                        pendingAmount = safeParseAmount(row.withdrawalText).negate();
                        txnType = "DEBIT";
                    } else if (!row.depositText.isEmpty()) {
                        pendingAmount = safeParseAmount(row.depositText);
                        txnType = "CREDIT";
                    } else {
                        log.warn("Row dated {} has neither withdrawal nor deposit — defaulting to 0", parsedDate);
                        pendingAmount = BigDecimal.ZERO;
                    }
                } else if (pendingDate != null && !row.narrationText.isEmpty()) {
                    // Wrapped narration continuation — same transaction, no new date on this line.
                    pendingNarration = (pendingNarration == null || pendingNarration.isEmpty())
                            ? row.narrationText
                            : pendingNarration + " " + row.narrationText;
                }
            }
        }

        void flush(List<EnhancedTransaction> results) {
            if (pendingDate != null) {
                EnhancedTransaction txn = new EnhancedTransaction();
                txn.setTransactionId(pendingTransactionId);
                txn.setDate(pendingDate.toString());
                txn.setPayee(pendingNarration);
                txn.setAmount(pendingAmount.doubleValue());
                txn.setTxnType(txnType);
                results.add(txn);
            }
            pendingDate = null;
            pendingNarration = null;
            pendingAmount = null;
        }
    }

    private static BigDecimal safeParseAmount(String raw) {
        try {
            return new BigDecimal(raw.replace(",", ""));
        } catch (NumberFormatException e) {
            log.warn("Unparseable amount '{}', defaulting to 0", raw);
            return BigDecimal.ZERO;
        }
    }
}