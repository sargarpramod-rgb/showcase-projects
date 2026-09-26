package com.transaction.dao;

import com.transaction.model.EnhancedTransaction;
import com.transaction.model.MonthlyTrendData;
import com.transaction.model.YearlyTrendData;
import com.transaction.model.CategoryTrendData;
import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
@Log4j2
public class TransactionDao {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String GET_TRANSACTIONS_BY_UPLOAD_ID = "SELECT c.name AS category_name,\n" +
            "       sc.name AS subcategory_name,\n" +
            "       t.*\n" +
            "FROM transactions t\n" +
            "LEFT JOIN categories c\n" +
            "  ON t.category_id = c.id\n" +
            "LEFT JOIN subcategories sc\n" +
            "  ON t.category_id = sc.category_id\n" +
            " AND t.subcategory_id = sc.id\n" +
            "WHERE t.upload_id = ?;\n";

    private String GET_TRANSACTIONS_BY_YEAR = "SELECT c.name AS category_name,\n" +
            "       sc.name AS subcategory_name,\n" +
            "       t.*\n" +
            "FROM transactions t\n" +
            "JOIN categories c\n" +
            "  ON t.category_id = c.id\n" +
            "JOIN subcategories sc\n" +
            "  ON t.category_id = sc.category_id\n" +
            " AND t.subcategory_id = sc.id\n" +
            "WHERE YEAR(t.txn_date) = ? AND t.user_id = ?;\n";

    private String GET_TRANSACTIONS_BY_USER_ID = "SELECT c.name AS category_name,\n" +
            "       sc.name AS subcategory_name,\n" +
            "       t.*\n" +
            "FROM transactions t\n" +
            "JOIN categories c\n" +
            "  ON t.category_id = c.id\n" +
            "JOIN subcategories sc\n" +
            "  ON t.category_id = sc.category_id\n" +
            " AND t.subcategory_id = sc.id\n" +
            "WHERE t.user_id = ? ORDER BY t.txn_date DESC;\n";


    // Bindings: authenticated user ID, inclusive start date, exclusive end date.
    private static final String TREND_SOURCE = """
            SELECT t.txn_date, ABS(t.amount) AS amount,
                   CASE
                       WHEN UPPER(TRIM(t.txn_type)) IN ('CREDIT', 'INCOME')
                           THEN 'INCOME'
                       WHEN UPPER(TRIM(t.txn_type)) IN ('DEBIT', 'EXPENSE')
                            AND UPPER(TRIM(c.name)) = 'INVESTMENTS'
                           THEN 'INVESTMENT'
                       WHEN UPPER(TRIM(t.txn_type)) IN ('DEBIT', 'EXPENSE')
                           THEN 'EXPENSE'
                       ELSE 'UNCLASSIFIED'
                   END AS flow_type
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = ?
              AND t.txn_date >= ?
              AND t.txn_date < ?
            """;

    private static final String CATEGORY_EXPENSE_SOURCE = """
            SELECT txn_date, category_id, category_name, amount
            FROM (
                SELECT t.txn_date, t.category_id, c.name AS category_name,
                       ABS(t.amount) AS amount,
                       CASE
                           WHEN UPPER(TRIM(t.txn_type)) IN ('CREDIT', 'INCOME') THEN 'INCOME'
                           WHEN UPPER(TRIM(t.txn_type)) IN ('DEBIT', 'EXPENSE')
                                AND UPPER(TRIM(c.name)) = 'INVESTMENTS' THEN 'INVESTMENT'
                           WHEN UPPER(TRIM(t.txn_type)) IN ('DEBIT', 'EXPENSE') THEN 'EXPENSE'
                           ELSE 'UNCLASSIFIED'
                       END AS flow_type
                FROM transactions t
                LEFT JOIN categories c ON c.id = t.category_id
                WHERE t.user_id = ?
                  AND t.txn_date >= ?
                  AND t.txn_date < ?
            ) classified
            WHERE flow_type = 'EXPENSE'
            """;

    // PostgreSQL month offsets preserve the start-date/month-count binding order.
    // Derived tables preserve JDBC bindings while keeping aggregation and LAG in SQL.
    static final String MONTHLY_TRENDS = """
            SELECT month_start, income, expenses, investments,
                   income - expenses - investments AS net_balance,
                   previous_month_amount,
                   expenses - previous_month_amount AS absolute_change,
                   ROUND(100.0 * (expenses - previous_month_amount)
                         / NULLIF(previous_month_amount, 0), 2) AS percentage_change,
                   transaction_count, unclassified_count
            FROM (
                SELECT filled.*,
                       LAG(expenses) OVER (ORDER BY month_start) AS previous_month_amount
                FROM (
                    SELECT m.month_start,
                           COALESCE(t.income, 0) AS income,
                           COALESCE(t.expenses, 0) AS expenses,
                           COALESCE(t.investments, 0) AS investments,
                           COALESCE(t.transaction_count, 0) AS transaction_count,
                           COALESCE(t.unclassified_count, 0) AS unclassified_count
                    FROM (
                        SELECT CAST(CAST(? AS DATE) + x * INTERVAL '1 month' AS DATE) AS month_start
                        FROM generate_series(0, CAST(? AS INTEGER)) AS months(x)
                    ) m
                    LEFT JOIN (
                        SELECT CAST(DATE_TRUNC('MONTH', txn_date) AS DATE) AS month_start,
                               SUM(CASE WHEN flow_type = 'INCOME' THEN amount ELSE 0 END) AS income,
                               SUM(CASE WHEN flow_type = 'EXPENSE' THEN amount ELSE 0 END) AS expenses,
                               SUM(CASE WHEN flow_type = 'INVESTMENT' THEN amount ELSE 0 END) AS investments,
                               COUNT(*) AS transaction_count,
                               SUM(CASE WHEN flow_type = 'UNCLASSIFIED' THEN 1 ELSE 0 END) AS unclassified_count
                        FROM (
            
            """ + TREND_SOURCE + """
            
                        ) classified
                        GROUP BY CAST(DATE_TRUNC('MONTH', txn_date) AS DATE)
                    ) t ON t.month_start = m.month_start
                ) filled
            ) compared
            ORDER BY month_start
            """;

    static final String YEARLY_TRENDS = """
            SELECT trend_year, income, expenses, investments,
                   income - expenses - investments AS net_balance,
                   transaction_count, unclassified_count
            FROM (
                SELECT EXTRACT(YEAR FROM txn_date) AS trend_year,
                       SUM(CASE WHEN flow_type = 'INCOME' THEN amount ELSE 0 END) AS income,
                       SUM(CASE WHEN flow_type = 'EXPENSE' THEN amount ELSE 0 END) AS expenses,
                       SUM(CASE WHEN flow_type = 'INVESTMENT' THEN amount ELSE 0 END) AS investments,
                       COUNT(*) AS transaction_count,
                       SUM(CASE WHEN flow_type = 'UNCLASSIFIED' THEN 1 ELSE 0 END) AS unclassified_count
                FROM (
            
            """ + TREND_SOURCE + """
            
                ) classified
                GROUP BY EXTRACT(YEAR FROM txn_date)
            ) yearly_totals
            ORDER BY trend_year
            """;

    // Fill each expense category across the requested PostgreSQL month series.
    // Keep missing months before LAG so comparisons use the previous calendar month.
    static final String CATEGORY_TRENDS = """
            SELECT month_start, category_id, category, total_amount, transaction_count,
                   previous_month_amount,
                   total_amount - previous_month_amount AS absolute_change,
                   ROUND(100.0 * (total_amount - previous_month_amount)
                         / NULLIF(previous_month_amount, 0), 2) AS percentage_change
            FROM (
                SELECT filled.*,
                       LAG(total_amount) OVER (
                           PARTITION BY category_id
                           ORDER BY month_start
                       ) AS previous_month_amount
                FROM (
                     SELECT m.month_start, c.category_id, c.category,
                            COALESCE(t.total_amount, CAST(0 AS DECIMAL(15, 2))) AS total_amount,
                            COALESCE(t.transaction_count, 0) AS transaction_count
                    FROM (
                        SELECT CAST(CAST(? AS DATE) + x * INTERVAL '1 month' AS DATE) AS month_start
                        FROM generate_series(0, CAST(? AS INTEGER)) AS months(x)
                    ) m
                    CROSS JOIN (
                        SELECT DISTINCT category_id,
                               COALESCE(category_name, 'Uncategorized') AS category
                        FROM (
            """ + CATEGORY_EXPENSE_SOURCE + """
                        ) expense_rows
                    ) c
                    LEFT JOIN (
                        SELECT CAST(DATE_TRUNC('MONTH', txn_date) AS DATE) AS month_start,
                               category_id,
                               category_name,
                                SUM(amount) AS total_amount,
                                COUNT(*) AS transaction_count
                        FROM (
            """ + CATEGORY_EXPENSE_SOURCE + """
                        ) expense_rows
                        GROUP BY CAST(DATE_TRUNC('MONTH', txn_date) AS DATE), category_id, category_name
                    ) t ON t.month_start = m.month_start
                       AND ((t.category_id = c.category_id)
                            OR (t.category_id IS NULL AND c.category_id IS NULL))
                ) filled
            ) compared
            ORDER BY month_start, category_id
            """;

    private String SAVE_TRANSACTIONS = """
                MERGE INTO transactions (transaction_id,user_id,upload_Id,txn_date,txn_date_str, payee, payee_full_name, amount, txn_type, category_id, subcategory_id)
                KEY(transaction_id)
                VALUES (?, ?,?, ?,?, ?, ?, ?, ?, ?,?);
               """;

    public Map<String, Long> populateCategoryMap() {

        return jdbcTemplate.query(
                "SELECT id, name FROM categories",
                rs -> {
                    Map<String, Long> map = new HashMap<>();
                    while (rs.next()) {
                        map.put(rs.getString("name"),
                                rs.getLong("id"));
                    }
                    return map;
                }
        );
    }

    public Map<String, Map<String, Long>> populateSubCategoryMap(Map<String,Long> categoryMap) {

        return jdbcTemplate.query(
                "SELECT id, category_id, name FROM subcategories",
                rs -> {
                    Map<String, Map<String, Long>> map = new HashMap<>();
                    while (rs.next()) {
                        Long categoryId = rs.getLong("category_id");
                        String subName = rs.getString("name");
                        Long subId = rs.getLong("id");

                        String categoryName = categoryMap.entrySet()
                                .stream()
                                .filter(e -> e.getValue().equals(categoryId))
                                .map(Map.Entry::getKey)
                                .findFirst()
                                .orElse(null);

                        map.computeIfAbsent(categoryName, k -> new HashMap<>())
                                .put(subName, subId);
                    }
                    return map;
                }
        );
    }

    public void saveTransactions(List<Object[]> batchArgs) {

        try {
            jdbcTemplate.batchUpdate(SAVE_TRANSACTIONS, batchArgs);
        } catch (Exception e) {
            batchArgs.forEach(args -> log.error("Failed to save transaction: " + args));
            log.error("Error occurred while saving transactions: " + e.getMessage(), e);
            throw new RuntimeException("Error occurred while saving transactions", e);
        }
    }

    public List<EnhancedTransaction> getByUploadId(Long uploadId) {

        return jdbcTemplate.query(GET_TRANSACTIONS_BY_UPLOAD_ID,
                new Object[]{uploadId}, new EnhancedTransactionRowMapper());
    }

    public List<EnhancedTransaction> getByYear(int year, Long userId) {
        return jdbcTemplate.query(
                GET_TRANSACTIONS_BY_YEAR,
                new Object[]{year,userId},
                new EnhancedTransactionRowMapper()
        );
    }

    public List<EnhancedTransaction> getByUserId(Long userId) {
        return jdbcTemplate.query(
                GET_TRANSACTIONS_BY_USER_ID,
                new Object[]{userId},
                new EnhancedTransactionRowMapper()
        );
    }

    // Amounts stay DECIMAL in SQL and BigDecimal in DTOs; no raw transaction mapping.
    public List<MonthlyTrendData> getMonthlyTrends(Long userId, LocalDate start, LocalDate end,
                                                  int monthCount, LocalDate today) {
        return jdbcTemplate.query(MONTHLY_TRENDS, (rs, row) -> {
            LocalDate month = rs.getDate("month_start").toLocalDate();
            MonthlyTrendData result = new MonthlyTrendData();
            result.setMonth(YearMonth.from(month).toString());
            result.setYear(month.getYear());
            result.setIncome(rs.getBigDecimal("income"));
            result.setExpenses(rs.getBigDecimal("expenses"));
            result.setInvestments(rs.getBigDecimal("investments"));
            result.setNetBalance(rs.getBigDecimal("net_balance"));
            result.setPreviousMonthAmount(rs.getBigDecimal("previous_month_amount"));
            result.setAbsoluteChange(rs.getBigDecimal("absolute_change"));
             result.setPercentageChange(rs.getBigDecimal("percentage_change"));
             result.setTransactionCount(rs.getLong("transaction_count"));
            result.setTransactionCount(rs.getLong("transaction_count"));
            result.setUnclassifiedCount(rs.getLong("unclassified_count"));
            result.setPartial(YearMonth.from(month).equals(YearMonth.from(today)));
            return result;
        }, Date.valueOf(start), monthCount - 1, userId, Date.valueOf(start), Date.valueOf(end));
    }

    public List<YearlyTrendData> getYearlyTrends(Long userId, LocalDate start, LocalDate end, LocalDate today) {
        return jdbcTemplate.query(YEARLY_TRENDS, (rs, row) -> {
            YearlyTrendData result = new YearlyTrendData();
            result.setYear(rs.getInt("trend_year"));
            result.setIncome(rs.getBigDecimal("income"));
            result.setExpenses(rs.getBigDecimal("expenses"));
            result.setInvestments(rs.getBigDecimal("investments"));
            result.setNetBalance(rs.getBigDecimal("net_balance"));
            result.setTransactionCount(rs.getLong("transaction_count"));
            result.setUnclassifiedCount(rs.getLong("unclassified_count"));
            result.setPartial(result.getYear() == today.getYear());
            return result;
        }, userId, Date.valueOf(start), Date.valueOf(end));
    }

    public List<CategoryTrendData> getCategoryTrends(long userId, LocalDate start, LocalDate end,
                                                      int monthCount) {
        return jdbcTemplate.query(CATEGORY_TRENDS, (rs, row) -> {
            CategoryTrendData result = new CategoryTrendData();
            result.setMonth(YearMonth.from(rs.getDate("month_start").toLocalDate()).toString());
            long categoryId = rs.getLong("category_id");
            result.setCategoryId(rs.wasNull() ? null : categoryId);
            result.setCategory(rs.getString("category"));
            result.setTotalAmount(rs.getBigDecimal("total_amount"));
            result.setPreviousMonthAmount(rs.getBigDecimal("previous_month_amount"));
            result.setAbsoluteChange(rs.getBigDecimal("absolute_change"));
            result.setPercentageChange(rs.getBigDecimal("percentage_change"));
            return result;
        }, Date.valueOf(start), monthCount - 1,
                userId, Date.valueOf(start), Date.valueOf(end),
                userId, Date.valueOf(start), Date.valueOf(end));
    }
}
