package com.transaction.dao;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.Map;

@Repository
public class TransactionDao {

    @Autowired
    private JdbcTemplate jdbcTemplate;

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
}
