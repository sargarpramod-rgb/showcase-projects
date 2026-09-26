package com.transaction.upload.strategy.pdf.bank;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HdfcBankStatementParserTests {
    private static final String REFERENCE = "0000116484308960";
    private static final String VALUE_DATE = "01/01/26";
    private static final String NARRATION = "UPI-ZOMATO-PAYZOMATO@HDFCBANK-HDFC0MERUP";
    private static final float ROW_Y = 257.525f;

    @Test
    void reproducedGeometryKeepsAllSevenCells() throws Exception {
        try (PDDocument document = statement(REFERENCE, 292.598f, VALUE_DATE, 362.499f, false,
                "1,932.50", "")) {
            Runs runs = new Runs();
            runs.getText(document);
            assertSpan(runs, REFERENCE, 292.598f, 356.598f);
            assertSpan(runs, VALUE_DATE, 362.499f, 390.947f);
            assertCells(document, REFERENCE, VALUE_DATE, "1,932.50", "");
        }
    }

    @Test
    void blankReferenceDoesNotStealValueDate() throws Exception {
        try (PDDocument document = statement("", 292.598f, VALUE_DATE, 362.499f, false, "1,932.50", "")) {
            assertCells(document, "", VALUE_DATE, "1,932.50", "");
        }
    }

    @Test
    void blankValueDateKeepsEntireReference() throws Exception {
        try (PDDocument document = statement(REFERENCE, 292.598f, "", 362.499f, false, "1,932.50", "")) {
            assertCells(document, REFERENCE, "", "1,932.50", "");
        }
    }

    @Test
    void longAlphanumericReferenceIsPositional() throws Exception {
        String reference = "AB12345678901234567";
        try (PDDocument document = statement(reference, 284f, VALUE_DATE, 362.499f, false, "1,932.50", "")) {
            assertCells(document, reference, VALUE_DATE, "1,932.50", "");
        }
    }

    @Test
    void splitValueDateAndHeaderFragmentsKeepTheirCell() throws Exception {
        try (PDDocument document = statement(REFERENCE, 292.598f, VALUE_DATE, 362.499f, true, "1,932.50", "")) {
            Runs runs = new Runs();
            runs.getText(document);
            // PDFBox can coalesce text-show operations; feed split callbacks explicitly below.
            assertTrue(runs.values.stream().anyMatch(r -> r.text.equals("Value")));
            assertTrue(runs.values.stream().anyMatch(r -> r.text.equals("Dt")));
            assertCells(document, REFERENCE, VALUE_DATE, "1,932.50", "", true);
        }
    }

    @Test
    void subPointGapStillBreaksAtValueDateBoundary() throws Exception {
        try (PDDocument document = statement(REFERENCE, 297f, VALUE_DATE, 361.6f, false, "1,932.50", "")) {
            assertCells(document, REFERENCE, VALUE_DATE, "1,932.50", "");
        }
    }

    @Test
    void touchingReferenceAndValueDateStillSeparate() throws Exception {
        try (PDDocument document = statement(REFERENCE, 297.503f, VALUE_DATE, 361.503f, false, "1,932.50", "")) {
            assertCells(document, REFERENCE, VALUE_DATE, "1,932.50", "");
        }
    }

    @Test
    void creditAndBalanceRemainSeparateWithBlankWithdrawal() throws Exception {
        try (PDDocument document = statement(REFERENCE, 292.598f, VALUE_DATE, 362.499f, false, "", "12,345.67")) {
            assertCells(document, REFERENCE, VALUE_DATE, "", "12,345.67");
        }
    }

    @Test
    void allAmountColumnsRemainSeparate() throws Exception {
        try (PDDocument document = statement(REFERENCE, 292.598f, VALUE_DATE, 362.499f, false, "1,932.50", "12,345.67")) {
            assertCells(document, REFERENCE, VALUE_DATE, "1,932.50", "12,345.67");
        }
    }

    @Test
    void glyphWidthCrossingDividerDoesNotMergeNextCell() throws Exception {
        // Last reference glyph starts at 360.9 and ends at 364.9, straddling the header-derived edge.
        try (PDDocument document = statement(REFERENCE, 300.9f, VALUE_DATE, 365f, false, "1,932.50", "")) {
            assertCells(document, REFERENCE, VALUE_DATE, "1,932.50", "");
        }
    }

    @Test
    void valueCellAssignmentDoesNotDependOnDateSyntax() throws Exception {
        try (PDDocument document = statement(REFERENCE, 292.598f, "ABCDEF", 362.499f, false, "1,932.50", "")) {
            assertCells(document, REFERENCE, "ABCDEF", "1,932.50", "");
        }
    }
    private static void assertCells(PDDocument document, String reference, String valueDate,
                                    String withdrawal, String deposit) throws Exception {
        assertCells(document, reference, valueDate, withdrawal, deposit, false);
    }

    private static void assertCells(PDDocument document, String reference, String valueDate,
                                    String withdrawal, String deposit, boolean splitCallbacks) throws Exception {
        Object boundaries = ReflectionTestUtils.invokeMethod(new HdfcBankStatementParser(),
                "getColumnBoundariesForFirstPageWithHeaderRows", document);
        Class<?> extractorType = Class.forName(HdfcBankStatementParser.class.getName() + "$RowExtractor");
        Constructor<?> constructor = extractorType.getDeclaredConstructor(float.class, float.class, boundaries.getClass());
        constructor.setAccessible(true);
        PDFTextStripper extractor = (PDFTextStripper) constructor.newInstance(ROW_Y - 1, ROW_Y + 1, boundaries);
        if (splitCallbacks) {
            ReflectionTestUtils.setField(extractor, "output", new java.io.StringWriter());
            Runs runs = new Runs();
            runs.getText(document);
            // Simulate arbitrary PDFBox callback boundaries using real extracted glyph positions.
            for (int i = 0; i < runs.rowPositions.size(); i += 3) {
                List<TextPosition> fragment = runs.rowPositions.subList(i, Math.min(i + 3, runs.rowPositions.size()));
                String text = fragment.stream().map(TextPosition::getUnicode).reduce("", String::concat);
                ReflectionTestUtils.invokeMethod(extractor, "writeString", text, fragment);
            }
        } else {
            extractor.getText(document);
        }
        List<?> rows = ReflectionTestUtils.invokeMethod(extractor, "buildRows");
        assertNotNull(rows);
        assertEquals(1, rows.size());
        Object row = rows.getFirst();
        assertAll(
                () -> assertEquals("01/01/26", ReflectionTestUtils.getField(row, "dateText")),
                () -> assertEquals(NARRATION, ReflectionTestUtils.getField(row, "narrationText")),
                () -> assertEquals(reference, ReflectionTestUtils.getField(row, "refNoText")),
                () -> assertEquals(valueDate, ReflectionTestUtils.getField(row, "valueDateText")),
                () -> assertEquals(withdrawal, ReflectionTestUtils.getField(row, "withdrawalText")),
                () -> assertEquals(deposit, ReflectionTestUtils.getField(row, "depositText")),
                () -> assertEquals("141,212.81", ReflectionTestUtils.getField(row, "balanceText")));
    }

    private static PDDocument statement(String reference, float refX, String valueDate, float valueX,
                                        boolean splitValue, String withdrawal, String deposit) throws Exception {
        PDDocument document = new PDDocument();
        PDPage page = new PDPage();
        document.addPage(page);
        PDType1Font header = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
        PDType1Font body = new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
        try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
            String[] labels = {"Date", "Narration", "Chq./Ref.No.", "Value", "Dt", "Withdrawal", "Amt.", "Deposit", "Amt.", "Closing", "Balance"};
            float[] starts = {39.909f, 144.183f, 283.525f, 361.503f, 383.503f, 405.322f, 448.658f, 491.054f, 518.830f, 564.281f, 592.065f};
            for (int i = 0; i < labels.length; i++) {
                text(stream, page, header, labels[i], starts[i], 239.855f);
            }
            text(stream, page, body, "01/01/26", 33.681f, ROW_Y);
            text(stream, page, body, NARRATION, 68.031f, ROW_Y);
            text(stream, page, body, reference, refX, ROW_Y);
            if (splitValue) {
                text(stream, page, body, "01/", valueX, ROW_Y);
                text(stream, page, body, "01/", valueX + 10.224f, ROW_Y);
                text(stream, page, body, "26", valueX + 20.448f, ROW_Y);
            } else {
                text(stream, page, body, valueDate, valueX, ROW_Y);
            }
            text(stream, page, body, withdrawal, 442.235f, ROW_Y);
            text(stream, page, body, deposit, 510f, ROW_Y);
            text(stream, page, body, "141,212.81", 590.705f, ROW_Y);
        }
        return document;
    }

    private static void text(PDPageContentStream stream, PDPage page, PDType1Font font,
                             String value, float x, float y) throws Exception {
        if (value.isEmpty()) return;
        stream.beginText();
        stream.setFont(font, 8);
        stream.newLineAtOffset(x, page.getMediaBox().getHeight() - y);
        stream.showText(value);
        stream.endText();
    }

    private static void assertSpan(Runs runs, String text, float start, float end) {
        Run run = runs.values.stream().filter(r -> r.text.equals(text) && Math.abs(r.start - start) < .002f)
                .findFirst().orElseThrow();
        assertEquals(start, run.start, .002f);
        assertEquals(end, run.end, .002f);
    }

    private record Run(String text, float start, float end) {}

    private static class Runs extends PDFTextStripper {
        final List<Run> values = new ArrayList<>();
        final List<TextPosition> rowPositions = new ArrayList<>();
        Runs() throws Exception { setSortByPosition(true); }
        @Override
        protected void writeString(String text, List<TextPosition> positions) {
            positions.stream().filter(p -> Math.abs(p.getYDirAdj() - ROW_Y) < .01f).forEach(rowPositions::add);
            if (!positions.isEmpty()) {
                TextPosition last = positions.getLast();
                values.add(new Run(text, positions.getFirst().getXDirAdj(), last.getXDirAdj() + last.getWidthDirAdj()));
            }
        }
    }
}
