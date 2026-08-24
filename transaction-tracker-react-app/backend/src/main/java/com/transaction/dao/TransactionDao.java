package com.transaction.dao;

import com.transaction.model.EnhancedTransaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class TransactionDao {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String GET_TRANSACTIONS_BY_UPLOAD_ID = "SELECT c.name AS category_name,\n" +
            "       sc.name AS subcategory_name,\n" +
            "       t.*\n" +
            "FROM transactions t\n" +
            "JOIN categories c\n" +
            "  ON t.category_id = c.id\n" +
            "JOIN subcategories sc\n" +
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
}
