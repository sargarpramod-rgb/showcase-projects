package com.transaction.upload.strategy.pdf.bank;


import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.EnhancedTransaction;
import com.transaction.upload.strategy.pdf.BankStatementParser;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import org.apache.pdfbox.text.TextPosition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.awt.geom.Rectangle2D;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class HdfcBankStatementParserOld implements BankStatementParser {

    private static final Logger log = LoggerFactory.getLogger(HdfcBankStatementParserOld.class);

    // --- Column X-boundaries ---
    // TODO: verify/replace using PdfColumnDiagnostic against your real HDFC PDF.
    private static final float DATE_X_START  = 30,  DATE_X_END  = 60;
    private static final float NARR_X_START  = 70,  NARR_X_END  = 360;
    private static final float WITH_X_START  = 400, WITH_X_END  = 530;
    private static final float DEP_X_START   = 530, DEP_X_END   = 600;
    private static final float BAL_X_START   = 600, BAL_X_END   = 680;

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
    public List<EnhancedTransaction> parse(PDDocument document) throws IOException {
        List<EnhancedTransaction> results = new ArrayList<>();

        List<PDPage> pages = new ArrayList<>();
        document.getPages().forEach(pages::add);

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

            PDFTextStripperByArea stripper = buildRegionStripper(tableStartY, tableEndY);
            stripper.extractRegions(page);

            List<EnhancedTransaction> pageResults = buildRowsFromColumns(
                    stripper.getTextForRegion("date"),
                    stripper.getTextForRegion("narration"),
                    stripper.getTextForRegion("withdrawal"),
                    stripper.getTextForRegion("deposit"),
                    stripper.getTextForRegion("balance")
            );

            if (pageResults.isEmpty()) {
                log.warn("Page {} produced zero transactions — possible template drift or coordinate mismatch", pageIndex + 1);
            }
            results.addAll(pageResults);
        }

       // return new Transactions(results);
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

    private PDFTextStripperByArea buildRegionStripper(float startY, float endY) throws IOException {
        float height = endY - startY;
        PDFTextStripperByArea stripper = new PDFTextStripperByArea();
        stripper.setSortByPosition(true);
        stripper.addRegion("date",       new Rectangle2D.Float(DATE_X_START, startY, DATE_X_END - DATE_X_START, height));
        stripper.addRegion("narration",  new Rectangle2D.Float(NARR_X_START, startY, NARR_X_END - NARR_X_START, height));
        stripper.addRegion("withdrawal", new Rectangle2D.Float(WITH_X_START, startY, WITH_X_END - WITH_X_START, height));
        stripper.addRegion("deposit",    new Rectangle2D.Float(DEP_X_START,  startY, DEP_X_END - DEP_X_START,  height));
        stripper.addRegion("balance",    new Rectangle2D.Float(BAL_X_START,  startY, BAL_X_END - BAL_X_START,  height));
        return stripper;
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

    // ---------- row assembly ----------

    /**
     * Each column's text is newline-delimited per visual row. A row only "starts"
     * where the date column has a valid date token; other lines are wrapped
     * narration continuations folded into the previous row.
     */
    private List<EnhancedTransaction> buildRowsFromColumns(
            String dateCol, String narrationCol, String withdrawalCol,
            String depositCol, String balanceCol) {

        String[] dateLines = dateCol.split("\\R", -1);
        String[] narrLines = narrationCol.split("\\R", -1);
        String[] withLines = withdrawalCol.split("\\R", -1);
        String[] depLines  = depositCol.split("\\R", -1);
        String[] balLines  = balanceCol.split("\\R", -1);

        List<EnhancedTransaction> results = new ArrayList<>();
        String pendingNarration = null;
        LocalDate pendingDate = null;
        BigDecimal pendingAmount = null;
        BigDecimal previousBalance = null;

        // logic is this simple.

        /*
            a) Read dateCell value.
            b) Read narration line 1
            c) Read narration line 2.
            d) Read narration line 3

         */

        int maxLines = Math.max(dateLines.length, narrLines.length);

        for (int i = 0; i < maxLines; i++) {
            String dateCell = i < dateLines.length ? dateLines[i].trim() : "";
            String narrText = i < narrLines.length ? narrLines[i].trim() : "";

            Matcher dateMatcher = DATE_PATTERN.matcher(dateCell);

            if (!dateCell.isEmpty() && dateMatcher.find()) {
                if (pendingDate != null) {
                    //results.add(new EnhancedTransaction(pendingDate, pendingNarration, pendingAmount));
                }

                LocalDate parsedDate;
                try {
                    parsedDate = LocalDate.parse(dateMatcher.group(), DATE_FMT);
                } catch (Exception e) {
                    pendingDate = null;
                    continue;
                }

                String leftover = dateCell.substring(dateMatcher.end()).trim();
                pendingDate = parsedDate;
                pendingNarration = leftover.isEmpty() ? narrText : (leftover + (narrText.isEmpty() ? "" : " " + narrText));

                String withdrawal = i < withLines.length ? withLines[i].trim() : "";
                String deposit    = i < depLines.length ? depLines[i].trim() : "";
                String balanceStr = i < balLines.length ? balLines[i].trim() : "";
                BigDecimal balance = balanceStr.isEmpty() ? null : safeParseAmount(balanceStr);

                if (!withdrawal.isEmpty()) {
                    pendingAmount = safeParseAmount(withdrawal).negate();
                } else if (!deposit.isEmpty()) {
                    pendingAmount = safeParseAmount(deposit);
                } else {
                    log.warn("Row dated {} has neither withdrawal nor deposit — defaulting to 0", parsedDate);
                    pendingAmount = BigDecimal.ZERO;
                }

                // Cross-check: does previousBalance + signedAmount == this row's balance?
                if (previousBalance != null && balance != null) {
                    BigDecimal expected = previousBalance.add(pendingAmount);
                    if (expected.compareTo(balance) != 0) {
                        log.warn("Balance mismatch on {}: expected {} but statement shows {} — possible column bleed, amount may be wrong ({})",
                                parsedDate, expected, balance, pendingAmount);
                        // Auto-correct using balance delta, since balance column is less likely to be misaligned
                        pendingAmount = balance.subtract(previousBalance);
                    }
                }

                if (balance != null) {
                    previousBalance = balance;
                }

            } else if (!narrText.isEmpty() && pendingNarration != null) {
                pendingNarration += " " + narrText;
            }
        }

        if (pendingDate != null) {
           // results.add(new EnhancedTransaction(pendingDate, pendingNarration, pendingAmount));
        }

        return results;
    }

    private BigDecimal safeParseAmount(String raw) {
        try {
            return new BigDecimal(raw.replace(",", ""));
        } catch (NumberFormatException e) {
            log.warn("Unparseable amount '{}', defaulting to 0", raw);
            return BigDecimal.ZERO;
        }
    }
}