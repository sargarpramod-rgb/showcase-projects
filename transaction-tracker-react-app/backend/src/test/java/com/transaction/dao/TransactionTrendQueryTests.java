package com.transaction.dao;

import com.transaction.model.MonthlyTrendData;
import com.transaction.model.YearlyTrendData;
import com.transaction.model.CategoryTrendData;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.flywaydb.core.Flyway;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class TransactionTrendQueryTests {
    @Container
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16.4");

    @BeforeAll
    static void migrate() {
        // Programmatic Flyway is independent of the H2 tests' disabled Boot auto-configuration.
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration/postgresql")
                .cleanDisabled(true)
                .load()
                .migrate();
    }
    private JdbcTemplate jdbc;
    private TransactionDao dao;
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 15);

    @BeforeEach
    void setup() {
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        jdbc.update("DELETE FROM transactions");
        dao = new TransactionDao();
        ReflectionTestUtils.setField(dao, "jdbcTemplate", jdbc);
    }


    @Test
    void missingMonthIsFilledBeforeLagAndZeroDenominatorIsNull() {
        insert(1, "2025-01-10", "-100.00", "DEBIT", 8);
        insert(1, "2025-03-10", "-150.00", "DEBIT", 8);
        List<MonthlyTrendData> rows = monthly(1, 2025);
        assertEquals(12, rows.size());
        assertEquals("2025-01", rows.get(0).getMonth());
        assertNull(rows.get(0).getPreviousMonthAmount());
        assertNull(rows.get(0).getAbsoluteChange());
        assertNull(rows.get(0).getPercentageChange());
        money("0", rows.get(1).getExpenses());
        money("100", rows.get(1).getPreviousMonthAmount());
        money("-100", rows.get(1).getAbsoluteChange());
        money("-100", rows.get(1).getPercentageChange());
        money("0", rows.get(2).getPreviousMonthAmount());
        money("150", rows.get(2).getAbsoluteChange());
        assertNull(rows.get(2).getPercentageChange());
    }

    @Test
    void creditIncomeAndDebitExpenseAreSeparatedRegardlessOfCase() {
        insert(1, "2025-01-01", "100.25", "Credit", null);
        insert(1, "2025-01-02", "50.10", " income ", null);
        insert(1, "2025-01-03", "-20.15", "Debit", 8);
        insert(1, "2025-01-04", "-10.05", "EXPENSE", null);
        MonthlyTrendData row = monthly(1, 2025).get(0);
        money("150.35", row.getIncome());
        money("30.20", row.getExpenses());
        money("120.15", row.getNetBalance());
        assertEquals(4, row.getTransactionCount());
    }

    @Test
    void investmentCategoryAppliesToDebitsButNotCredits() {
        insert(1, "2025-01-01", "-80", "DEBIT", 3);
        insert(1, "2025-01-02", "-20", "EXPENSE", 3);
        insert(1, "2025-01-03", "25", "CREDIT", 3);
        MonthlyTrendData row = monthly(1, 2025).get(0);
        money("100", row.getInvestments());
        money("0", row.getExpenses());
        money("25", row.getIncome());
        money("-75", row.getNetBalance());
    }

    @Test
    void unknownTypesAreCountedWithoutBecomingExpenses() {
        insert(1, "2025-01-01", "-500", "UNKNOWN", 8);
        insert(1, "2025-01-02", "20", "UNRECOGNIZED", null);
        MonthlyTrendData row = monthly(1, 2025).get(0);
        money("0", row.getExpenses());
        money("0", row.getIncome());
        assertEquals(2, row.getUnclassifiedCount());
        assertEquals(2, row.getTransactionCount());
        assertEquals(2, yearly(1).get(0).getUnclassifiedCount());
    }

    @Test
    void uncategorizedAndSmallTransactionsAreIncludedWithoutJoinMultiplication() {
        insert(1, "2025-01-01", "-0.10", "DEBIT", null);
        insert(1, "2025-01-02", "-0.20", "DEBIT", 8); // no subcategory
        MonthlyTrendData row = monthly(1, 2025).get(0);
        money("0.30", row.getExpenses());
        assertEquals(2, row.getTransactionCount());
        money("0.30", yearly(1).get(0).getExpenses());
    }

    @Test
    void decimalAmountsAndPercentageChangesStayExact() {
        insert(1, "2025-01-01", "-0.10", "DEBIT", null);
        insert(1, "2025-02-01", "-0.10", "DEBIT", null);
        insert(1, "2025-02-02", "-0.20", "DEBIT", null);
        MonthlyTrendData february = monthly(1, 2025).get(1);
        money("0.30", february.getExpenses());
        money("0.20", february.getAbsoluteChange());
        money("200.00", february.getPercentageChange());
        money("0.40", yearly(1).get(0).getExpenses());
    }

    @Test
    void bothQueriesOnlyIncludeTheAuthenticatedUsersTransactions() {
        insert(1, "2025-01-01", "-10", "DEBIT", null);
        insert(2, "2025-01-01", "-9999", "DEBIT", null);
        insert(2, "2024-01-01", "50000", "CREDIT", null);
        money("10", monthly(1, 2025).get(0).getExpenses());
        assertEquals(1, yearly(1).size());
        money("10", yearly(1).get(0).getExpenses());
    }

    @Test
    void currentYearStopsAtCurrentMonthAndExcludesFutureDatedTransactions() {
        insert(1, "2026-09-15", "-10", "DEBIT", null);
        insert(1, "2026-09-16", "-20", "DEBIT", null);
        insert(1, "2026-10-01", "-30", "DEBIT", null);
        var rows = monthly(1, 2026);
        assertEquals(9, rows.size());
        assertEquals("2026-09", rows.get(8).getMonth());
        assertTrue(rows.get(8).isPartial());
        assertFalse(rows.get(7).isPartial());
        money("10", rows.get(8).getExpenses());
        money("10", yearly(1).get(0).getExpenses());
    }

    @Test
    void rangeBoundariesAndChronologicalOrderingAreCorrect() {
        insert(1, "2026-01-01", "-30", "DEBIT", null);
        insert(1, "2024-12-31", "-10", "DEBIT", null);
        insert(1, "2025-12-31", "-20", "DEBIT", null);
        var monthly = monthly(1, 2025);
        money("20", monthly.get(11).getExpenses());
        money("0", monthly.get(0).getExpenses());
        var yearly = yearly(1);
        assertEquals(List.of(2024, 2025, 2026), yearly.stream().map(YearlyTrendData::getYear).toList());
        assertEquals(List.of("2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
                        "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"),
                monthly.stream().map(MonthlyTrendData::getMonth).toList());
    }

    @Test
    void yearlyNetBalanceSubtractsInvestmentsAndExpenses() {
        insert(1, "2025-01-01", "100", "CREDIT", null);
        insert(1, "2025-02-01", "-80", "DEBIT", 3);
        insert(1, "2025-03-01", "-40", "DEBIT", null);
        money("-20", yearly(1).get(0).getNetBalance());
        money("-20", new MonthlyTrendData("2025-01", 2025, new BigDecimal("100"),
                new BigDecimal("40"), new BigDecimal("80")).getNetBalance());
        money("-20", new YearlyTrendData(2025, new BigDecimal("100"),
                new BigDecimal("40"), new BigDecimal("80")).getNetBalance());
    }

    @Test
    void emptyHistoricalYearHasCorrectYearAndZeroTotals() {
        var rows = monthly(1, 2020);
        assertEquals(12, rows.size());
        assertTrue(rows.stream().allMatch(row -> row.getYear() == 2020 && row.getTransactionCount() == 0));
        assertNull(rows.get(0).getPercentageChange());
        money("0", rows.get(1).getPreviousMonthAmount());
    }

    @Test
    void categoryTrendsFillMonthsAndExcludeIncomeInvestmentsAndOtherUsers() {
        insert(1, "2025-01-01", "100.10", "CREDIT", 8);
        insert(1, "2025-01-01", "-10.10", "DEBIT", 8);
        insert(1, "2025-03-01", "-20.20", "DEBIT", null);
        insert(1, "2025-03-02", "-30.30", "DEBIT", 3);
        insert(2, "2025-01-01", "-999.99", "DEBIT", 8);
        List<CategoryTrendData> rows = dao.getCategoryTrends(1, LocalDate.of(2025, 1, 1),
                LocalDate.of(2026, 1, 1), 12);
        List<CategoryTrendData> food = rows.stream().filter(r -> Long.valueOf(8).equals(r.getCategoryId())).toList();
        List<CategoryTrendData> uncategorized = rows.stream().filter(r -> r.getCategoryId() == null).toList();
        assertEquals(12, food.size());
        assertEquals(12, uncategorized.size());
        money("10.10", food.get(0).getTotalAmount());
        money("0", food.get(1).getTotalAmount());
        assertNull(food.get(0).getPreviousMonthAmount());
        money("-100.00", food.get(1).getPercentageChange());
        money("20.20", uncategorized.get(2).getTotalAmount());
        assertEquals("Uncategorized", uncategorized.get(0).getCategory());
        assertFalse(rows.stream().anyMatch(r -> r.getCategoryId() != null && r.getCategoryId() == 3L));
    }

    @Test
    void categoryTrendKeepsDecimalPrecisionAndUsesPreviousMonth() {
        insert(1, "2025-01-01", "-0.10", "DEBIT", 8);
        insert(1, "2025-02-01", "-0.20", "DEBIT", 8);
        var rows = dao.getCategoryTrends(1, LocalDate.of(2025, 1, 1), LocalDate.of(2026, 1, 1), 12)
                .stream().filter(r -> Long.valueOf(8).equals(r.getCategoryId())).toList();
        money("0.20", rows.get(1).getTotalAmount());
        money("0.10", rows.get(1).getPreviousMonthAmount());
        money("0.10", rows.get(1).getAbsoluteChange());
        money("100.00", rows.get(1).getPercentageChange());
    }

    @Test
    void categoryCutoffExcludesFutureOnlyCategoriesAndOtherUsers() {
        insert(1, "2026-09-15", "-0.10", "DEBIT", 8);
        insert(1, "2026-09-16", "-99", "DEBIT", 9);
        insert(1, "2026-10-01", "-99", "DEBIT", 8);
        insert(2, "2026-01-01", "-99", "DEBIT", 1);
        var rows = dao.getCategoryTrends(1, LocalDate.of(2026, 1, 1), TODAY.plusDays(1), 9);
        assertEquals(9, rows.size());
        assertTrue(rows.stream().allMatch(row -> Long.valueOf(8).equals(row.getCategoryId())));
        assertEquals("2026-09", rows.get(8).getMonth());
        money("0.10", rows.get(8).getTotalAmount());
        assertNull(rows.get(8).getPercentageChange());
    }

    @Test
    void subcategoriesRollUpOnceIntoTheirCategory() {
        insert(1, "2025-01-01", "-0.10", "DEBIT", 8);
        insert(1, "2025-01-02", "-0.20", "DEBIT", 8);
        jdbc.update("UPDATE transactions SET subcategory_id = 25 WHERE txn_date = ?", Date.valueOf("2025-01-01"));
        jdbc.update("UPDATE transactions SET subcategory_id = 26 WHERE txn_date = ?", Date.valueOf("2025-01-02"));
        var rows = dao.getCategoryTrends(1, LocalDate.of(2025, 1, 1), LocalDate.of(2026, 1, 1), 12);
        assertEquals(12, rows.size());
        assertEquals("Food", rows.get(0).getCategory());
        money("0.30", rows.get(0).getTotalAmount());
        money("0.30", monthly(1, 2025).get(0).getExpenses());
        assertEquals(2, monthly(1, 2025).get(0).getTransactionCount());
        money("0.30", yearly(1).get(0).getExpenses());
    }

    @Test
    void emptyUserHasNoYearlyOrCategoryRows() {
        insert(2, "2025-01-01", "-10", "DEBIT", 8);
        assertTrue(yearly(1).isEmpty());
        assertTrue(dao.getCategoryTrends(1, LocalDate.of(2025, 1, 1),
                LocalDate.of(2026, 1, 1), 12).isEmpty());
    }
    private List<MonthlyTrendData> monthly(long user, int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        boolean current = year == TODAY.getYear();
        return dao.getMonthlyTrends(user, start, current ? TODAY.plusDays(1) : start.plusYears(1),
                current ? TODAY.getMonthValue() : 12, TODAY);
    }

    private List<YearlyTrendData> yearly(long user) {
        return dao.getYearlyTrends(user, LocalDate.of(1, 1, 1), TODAY.plusDays(1), TODAY);
    }

    private void insert(long user, String date, String amount, String type, Integer category) {
        jdbc.update("""
                INSERT INTO transactions(transaction_id, user_id, txn_date, txn_date_str,
                                         payee, amount, txn_type, category_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID().toString(), user, Date.valueOf(date), date, "Test",
                new BigDecimal(amount), type, category);
    }

    private void money(String expected, BigDecimal actual) {
        assertNotNull(actual);
        assertEquals(0, new BigDecimal(expected).compareTo(actual), () -> "Expected " + expected + ", got " + actual);
    }
}
