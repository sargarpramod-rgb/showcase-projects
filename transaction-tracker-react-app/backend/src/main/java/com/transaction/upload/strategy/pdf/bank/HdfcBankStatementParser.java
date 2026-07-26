package com.transaction.upload.strategy.pdf.bank;


import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.EnhancedTransaction;
import com.transaction.upload.strategy.pdf.BankStatementParser;
import com.transaction.util.TransactionUtil;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class HdfcBankStatementParser implements BankStatementParser {

    private static final Logger log = LoggerFactory.getLogger(HdfcBankStatementParser.class);

    // How close in Y two text runs need to be to be considered "the same visual row".
    private static final float ROW_Y_TOLERANCE = 3.0f;

    // Extra vertical slack used only when scanning the header line itself, since the Y we
    // locate it at (see findTextY) already carries a small +2 buffer past the line.
    private static final float HEADER_Y_TOLERANCE = 6.0f;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yy");
    private static final Pattern DATE_PATTERN = Pattern.compile("\\d{2}/\\d{2}/\\d{2}");

    private static final String STATEMENT_LINE_ANCHOR = "Statement of account";
    private static final String COLUMN_HEADER_ANCHOR   = "Withdrawal Amt";
    private static final String FOOTER_ANCHOR          = "HDFC BANK LIMITED";

    @Override
    public boolean canParse(String plainTextSample) {
        String normalized = plainTextSample.replaceAll("\\s+", " ").toUpperCase();
        return normalized.contains("HDFC BANK") && normalized.contains("STATEMENT OF ACCOUNT");
    }

    @Override
    public List<EnhancedTransaction> parse(PDDocument document) throws IOException {
        List<EnhancedTransaction> results = new ArrayList<>();

        List<PDPage> pages = new ArrayList<>();
        document.getPages().forEach(pages::add);

        // Accumulator lives OUTSIDE the page loop: a transaction's wrapped narration
        // can legitimately continue onto the top of the next page, so state must
        // survive page boundaries and only be flushed when the *next date* appears
        // (or at the very end of the document).
        TransactionAccumulator accumulator = new TransactionAccumulator();

        // Column boundaries are detected fresh from each page's own header row where one
        // exists (page 1, and any later page that happens to repeat the header). Pages
        // without a header (typical continuation pages) reuse whatever layout was most
        // recently detected, since HDFC keeps column positions constant across a statement.
        ColumnBoundaries lastKnownBoundaries = null;

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

            ColumnBoundaries boundaries;
            if (columnHeaderY > 0) {
                boundaries = detectColumnBoundaries(document, pageIndex, columnHeaderY);
                lastKnownBoundaries = boundaries;
            } else if (lastKnownBoundaries != null) {
                boundaries = lastKnownBoundaries;
            } else {
                log.warn("Page {} has no header row and no previously detected layout — falling back to default column coordinates", pageIndex + 1);
                boundaries = DEFAULT_COLUMN_BOUNDARIES;
            }

            RowExtractor extractor = new RowExtractor(tableStartY, tableEndY, boundaries);
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

        return results;
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

    // ---------- column model ----------

    private enum Column { DATE, NARRATION, REF_NO, VALUE_DATE, WITHDRAWAL, DEPOSIT, BALANCE }

    // Expected header label text for each column, in left-to-right reading order. Matching is
    // done against a normalized (alphanumeric-only, lowercased) form, so minor differences in
    // spacing or punctuation extraction ("Chq./Ref.No." vs "Chq. / Ref. No.") don't matter.
    private static final Map<Column, String> HEADER_LABELS = new LinkedHashMap<>();
    static {
        HEADER_LABELS.put(Column.DATE, "Date");
        HEADER_LABELS.put(Column.NARRATION, "Narration");
        HEADER_LABELS.put(Column.REF_NO, "Chq./Ref.No.");
        HEADER_LABELS.put(Column.VALUE_DATE, "Value Dt");
        HEADER_LABELS.put(Column.WITHDRAWAL, "Withdrawal Amt.");
        HEADER_LABELS.put(Column.DEPOSIT, "Deposit Amt.");
        HEADER_LABELS.put(Column.BALANCE, "Closing Balance");
    }

    // Legacy fixed coordinates, kept ONLY as a last-resort fallback for the rare page where a
    // header row can't be located at all (e.g. a damaged or non-standard PDF). Whenever a
    // header row is available, detectColumnBoundaries() below computes real boundaries from it
    // instead — this fallback doesn't know about REF_NO/VALUE_DATE since the original layout
    // it came from never separated them out.
    private static final ColumnBoundaries DEFAULT_COLUMN_BOUNDARIES = buildDefaultBoundaries();

    private static ColumnBoundaries buildDefaultBoundaries() {
        List<Column> order = List.of(Column.DATE, Column.NARRATION, Column.WITHDRAWAL, Column.DEPOSIT, Column.BALANCE);
        List<float[]> ranges = List.of(
                new float[]{0, 60},
                new float[]{60, 480},
                new float[]{480, 530},
                new float[]{530, 600},
                new float[]{600, Float.MAX_VALUE}
        );
        return ColumnBoundaries.fromOrderedRanges(order, ranges);
    }

    private static String normalize(String s) {
        return s.replaceAll("[^A-Za-z0-9]", "").toLowerCase();
    }

    /**
     * Scans the header row at {@code headerY} on the given page, matches each expected column
     * label to the token(s) that spell it out, and derives column boundaries as the midpoints
     * between adjacent matched labels. This replaces hand-measured X coordinates with values
     * read straight off the actual PDF, so the parser adapts automatically to statements whose
     * margins or column widths differ slightly (different HDFC branches/export tools, etc.).
     */
    private ColumnBoundaries detectColumnBoundaries(PDDocument document, int pageIndex, float headerY) throws IOException {
        HeaderColumnFinder finder = new HeaderColumnFinder(headerY, HEADER_Y_TOLERANCE);
        finder.setStartPage(pageIndex + 1);
        finder.setEndPage(pageIndex + 1);
        finder.getText(document);

        List<Token> headerTokens = TokenUtil.groupByGap(finder.headerChars());
        headerTokens.sort(Comparator.comparing(Token::minX));

        List<Column> order = new ArrayList<>(HEADER_LABELS.keySet());
        List<float[]> spans = new ArrayList<>();
        int tokenIdx = 0;

        for (Column col : order) {
            String targetNorm = normalize(HEADER_LABELS.get(col));
            int startIdx = tokenIdx;
            String acc = "";
            float minX = Float.MAX_VALUE, maxX = -Float.MAX_VALUE;

            while (tokenIdx < headerTokens.size()) {
                Token t = headerTokens.get(tokenIdx);
                String tn = normalize(t.text());
                if (tn.isEmpty()) {
                    tokenIdx++;
                    continue;
                }
                String attempt = acc + tn;
                if (!targetNorm.startsWith(attempt) && !attempt.startsWith(targetNorm)) {
                    break;
                }
                acc = attempt;
                minX = Math.min(minX, t.minX());
                maxX = Math.max(maxX, t.maxX());
                tokenIdx++;
                if (acc.equals(targetNorm)) {
                    break;
                }
            }

            if (acc.equals(targetNorm)) {
                spans.add(new float[]{minX, maxX});
            } else {
                tokenIdx = startIdx; // don't consume tokens on a failed match
                spans.add(null);
            }
        }

        boolean allMatched = spans.stream().noneMatch(java.util.Objects::isNull);
        if (!allMatched) {
            log.warn("Page {}: could not locate all column headers dynamically — falling back to default coordinates", pageIndex + 1);
            return DEFAULT_COLUMN_BOUNDARIES;
        }

        List<float[]> ranges = new ArrayList<>();
        for (int i = 0; i < order.size(); i++) {
            float start = (i == 0) ? 0f : (spans.get(i - 1)[1] + spans.get(i)[0]) / 2f;
            float end = (i == order.size() - 1) ? Float.MAX_VALUE : (spans.get(i)[1] + spans.get(i + 1)[0]) / 2f;
            ranges.add(new float[]{start, end});
        }
        return ColumnBoundaries.fromOrderedRanges(order, ranges);
    }

    /** Captures only the characters sitting on the header row's Y so they can be tokenized separately. */
    private static class HeaderColumnFinder extends PDFTextStripper {
        private final float targetY;
        private final float yTolerance;
        private final List<TextPosition> headerChars = new ArrayList<>();

        HeaderColumnFinder(float targetY, float yTolerance) throws IOException {
            this.targetY = targetY;
            this.yTolerance = yTolerance;
            setSortByPosition(true);
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) throws IOException {
            for (TextPosition tp : positions) {
                if (Math.abs(tp.getYDirAdj() - targetY) <= yTolerance) {
                    headerChars.add(tp);
                }
            }
            super.writeString(text, positions);
        }

        List<TextPosition> headerChars() {
            headerChars.sort(Comparator.comparing(TextPosition::getXDirAdj));
            return headerChars;
        }
    }

    /**
     * Holds the resolved [start, end) X-range for every column on a given page, plus the flat
     * list of boundary edges used to force token breaks. Two pages of the same statement can
     * have their own instance if their headers were detected independently, though in practice
     * continuation pages just reuse the one from the last page that had a header.
     */
    private static final class ColumnBoundaries {
        private final Map<Column, float[]> ranges;
        private final float[] edges;

        private ColumnBoundaries(Map<Column, float[]> ranges, float[] edges) {
            this.ranges = ranges;
            this.edges = edges;
        }

        static ColumnBoundaries fromOrderedRanges(List<Column> order, List<float[]> startEndPairs) {
            Map<Column, float[]> ranges = new EnumMap<>(Column.class);
            for (int i = 0; i < order.size(); i++) {
                ranges.put(order.get(i), startEndPairs.get(i));
            }
            float[] edges = new float[Math.max(0, order.size() - 1)];
            for (int i = 0; i < edges.length; i++) {
                edges[i] = startEndPairs.get(i)[1];
            }
            return new ColumnBoundaries(ranges, edges);
        }

        Column classify(float x) {
            for (Map.Entry<Column, float[]> e : ranges.entrySet()) {
                float[] r = e.getValue();
                if (x >= r[0] && x < r[1]) {
                    return e.getKey();
                }
            }
            // Fallback: nearest column by center distance, for text that slightly overshoots
            // its column (real PDFs rarely line up to the pixel).
            Column best = Column.NARRATION;
            float bestDist = Float.MAX_VALUE;
            for (Map.Entry<Column, float[]> e : ranges.entrySet()) {
                float[] r = e.getValue();
                float center = (r[1] == Float.MAX_VALUE) ? r[0] : (r[0] + r[1]) / 2f;
                float dist = Math.abs(x - center);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = e.getKey();
                }
            }
            return best;
        }

        float[] edges() {
            return edges;
        }
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

        float minX() {
            return minX;
        }

        float maxX() {
            return maxX;
        }

        float centerX() {
            return (minX + maxX) / 2f;
        }

        String text() {
            return text.toString();
        }
    }

    /** Turns a Y-sorted run of characters into tokens. */
    private static final class TokenUtil {
        private TokenUtil() {}

        /** Pure gap-based tokenizing — used for the header row, before any boundaries exist. */
        static List<Token> groupByGap(List<TextPosition> sortedChars) {
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

        /**
         * Same as {@link #groupByGap}, but additionally forces a token break wherever two
         * adjacent characters straddle one of the given column boundaries — even with zero
         * visual gap between them. Without this, a narration that starts flush against the end
         * of the date column (no rendered whitespace in between) would get glued onto the date
         * into a single token, which then gets classified — date digits and all — into whatever
         * column its combined center falls in.
         */
        static List<Token> groupByGapAndBoundaries(List<TextPosition> sortedChars, float[] boundaries) {
            List<Token> tokens = new ArrayList<>();
            Token current = null;
            Float prevEndX = null;

            for (TextPosition tp : sortedChars) {
                float x = tp.getXDirAdj();
                float gapThreshold = Math.max(tp.getWidthDirAdj(), 2f) * 1.5f;
                boolean gapBreak = current == null || prevEndX == null || (x - prevEndX) > gapThreshold;
                boolean boundaryBreak = prevEndX != null && crossesBoundary(prevEndX, x, boundaries);

                if (gapBreak || boundaryBreak) {
                    current = new Token();
                    tokens.add(current);
                }
                current.add(tp);
                prevEndX = x + tp.getWidthDirAdj();
            }
            return tokens;
        }

        private static boolean crossesBoundary(float prevEndX, float x, float[] boundaries) {
            for (float b : boundaries) {
                if (prevEndX < b && x >= b) {
                    return true;
                }
            }
            return false;
        }
    }

    /** One visual row on the page, holding the raw characters captured at that Y until tokenized. */
    private static class Row {
        final float y;
        final List<TextPosition> chars = new ArrayList<>();

        String dateText = "", narrationText = "", refNoText = "", valueDateText = "",
                withdrawalText = "", depositText = "", balanceText = "";

        Row(float y) {
            this.y = y;
        }

        void add(TextPosition tp) {
            chars.add(tp);
        }

        void finalizeRow(ColumnBoundaries boundaries) {
            chars.sort(Comparator.comparing(TextPosition::getXDirAdj));

            // The DATE/NARRATION boundary comes from where the header words "Date" and
            // "Narration" sit — but a given row's narration text doesn't always start exactly
            // there, and when it starts flush against the date with no rendered gap, trusting
            // that boundary alone can pull the date's own digits into narration. A date's
            // shape (dd/mm/yy) is unambiguous, so instead we look for it directly at the start
            // of the row's character stream and split right after the matched digits — the
            // column boundary is only used for everything to the right of that point.
            int dateEndCharIndex = findLeadingDateEndIndex(chars);

            List<TextPosition> dateChars = dateEndCharIndex > 0
                    ? chars.subList(0, dateEndCharIndex)
                    : List.of();
            List<TextPosition> remainingChars = dateEndCharIndex > 0
                    ? chars.subList(dateEndCharIndex, chars.size())
                    : chars;

            StringBuilder dateBuf = new StringBuilder();
            for (TextPosition tp : dateChars) {
                dateBuf.append(tp.getUnicode());
            }
            dateText = dateBuf.toString().trim();

            List<Token> tokens = TokenUtil.groupByGapAndBoundaries(remainingChars, boundaries.edges());

            Map<Column, StringBuilder> byColumn = new EnumMap<>(Column.class);
            for (Column c : Column.values()) {
                byColumn.put(c, new StringBuilder());
            }

            // Each token is assigned to exactly ONE column, based on the token's horizontal
            // center. A blank column simply gets no tokens — it can no longer "steal"
            // characters from a neighbor, because tokens are never split mid-word/mid-number.
            for (Token t : tokens) {
                Column col = boundaries.classify(t.centerX());
                if (col == Column.DATE) {
                    // The real date was already carved out above by regex; anything from the
                    // remaining characters that would still land in DATE is bleed-through
                    // (e.g. a boundary that sits a hair too far right) — keep it in narration.
                    col = Column.NARRATION;
                }
                StringBuilder sb = byColumn.get(col);
                if (sb.length() > 0) {
                    sb.append(' ');
                }
                sb.append(t.text());
            }

            narrationText = byColumn.get(Column.NARRATION).toString().trim();
            refNoText = byColumn.get(Column.REF_NO).toString().trim();
            valueDateText = byColumn.get(Column.VALUE_DATE).toString().trim();
            withdrawalText = byColumn.get(Column.WITHDRAWAL).toString().trim();
            depositText = byColumn.get(Column.DEPOSIT).toString().trim();
            balanceText = byColumn.get(Column.BALANCE).toString().trim();
        }

        /**
         * Looks for a dd/mm/yy date anchored at the very start of the row's character stream
         * (a continuation/wrapped-narration row won't have one, and correctly yields -1 so the
         * whole row is treated as narration). Returns the character index right after the
         * matched date, or -1 if the row doesn't start with a date.
         */
        private static int findLeadingDateEndIndex(List<TextPosition> sortedChars) {
            StringBuilder raw = new StringBuilder();
            for (TextPosition tp : sortedChars) {
                raw.append(tp.getUnicode());
            }
            Matcher m = DATE_PATTERN.matcher(raw);
            return m.lookingAt() ? m.end() : -1;
        }
    }

    /**
     * Extracts every character in the table region and groups characters that sit on the
     * same visual line (within {@link #ROW_Y_TOLERANCE}) into a {@link Row}. Column
     * classification is deferred to {@link Row#finalizeRow}, which works on whole tokens
     * rather than individual characters.
     */
    private static class RowExtractor extends PDFTextStripper {
        private final float minY, maxY;
        private final ColumnBoundaries boundaries;
        private final List<Row> rows = new ArrayList<>();

        RowExtractor(float minY, float maxY, ColumnBoundaries boundaries) throws IOException {
            this.minY = minY;
            this.maxY = maxY;
            this.boundaries = boundaries;
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
                r.finalizeRow(boundaries);
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
        private String pendingValueDate;
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

                    pendingTransactionId = row.refNoText;
                    pendingDate = parsedDate;
                    pendingNarration = row.narrationText;
                    pendingValueDate = row.valueDateText;

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
                } else if (pendingDate != null && !row.narrationText.isEmpty() && !row.narrationText.equalsIgnoreCase(FOOTER_ANCHOR)) {
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

                TransactionUtil.setPayeeDetails(txn,pendingNarration);
               // txn.setPayee(pendingNarration);
                txn.setAmount(pendingAmount.doubleValue());
                txn.setTxnType(txnType);
                // TODO: wire pendingValueDate ("01/06/26" style string, parse with DATE_FMT)
                // into EnhancedTransaction once that model exposes a value-date field/setter.
                results.add(txn);
            }
            pendingDate = null;
            pendingNarration = null;
            pendingAmount = null;
            pendingTransactionId = null;
            pendingValueDate = null;
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