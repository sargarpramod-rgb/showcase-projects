package com.transaction.dao;

import com.transaction.model.PayeeCategoryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Repository
@RequiredArgsConstructor
@Log4j2
public class PayeeCategoryRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    Map<String,Long> categoryMap;

    private static final String GET_PAYEE_CATEGORY_MAPPING_BY_USER_ID =  """
              SELECT
              pc.payee_name,
              pc.user_id,
              c.name AS category_name,
              sc.name AS subcategory_name
              FROM payee_category_mapping pc
                JOIN categories c
              ON pc.category_id = c.id
                JOIN subcategories sc
              ON pc.category_id= sc.category_id
              AND pc.subcategory_id=sc.id
              where pc.user_id = ?
                """;


    private static final String SAVE_PAYEE_CATEGORY_MAPPING = """
                MERGE INTO payee_category_mapping (payee_name, category_id, subcategory_id, user_id)
                KEY (payee_name)
                VALUES (?, ?, ?, ?);
    """;

    public List<PayeeCategoryResponse> getByUserId(Long userId) {

        return jdbcTemplate.query(GET_PAYEE_CATEGORY_MAPPING_BY_USER_ID, new Object[]{userId}, (rs, rowNum) ->
                new PayeeCategoryResponse(rs.getString("payee_name"),
                        rs.getString("category_name"),
                        rs.getString("subcategory_name"),
                        rs.getLong("user_id")));
    }

    //TODO: Check if categoryId can be passed back from UI.
    public void saveAll(List<PayeeCategoryResponse> payeeCategoryResponses) {

        // Resolve names to IDs first
        List<Object[]> batchArgs = payeeCategoryResponses.stream()
                .filter(req -> Objects.nonNull(req.getCategoryName())
                        && Objects.nonNull(req.getSubCategoryName()))
                .map(req -> {
                    Long categoryId = categoryMap.get(req.getCategoryName());

                    Map<String, Map<String, Long>> subCategoryMap1 = jdbcTemplate.query(
                            "SELECT id, category_id, name FROM subcategories",
                            rs -> {
                                Map<String, Map<String, Long>> map = new HashMap<>();
                                while (rs.next()) {
                                    Long categoryId1 = rs.getLong("category_id");
                                    String subName = rs.getString("name");
                                    Long subId = rs.getLong("id");

                                    String categoryName = categoryMap.entrySet()
                                            .stream()
                                            .filter(e -> e.getValue().equals(categoryId1))
                                            .map(Map.Entry::getKey)
                                            .findFirst()
                                            .orElse(null);

                                    map.computeIfAbsent(categoryName, k -> new HashMap<>())
                                            .put(subName, subId);
                                }
                                return map;
                            }
                    );


                    Long subCategoryId = subCategoryMap1.getOrDefault(req.getCategoryName(), Map.of())
                            .get(req.getSubCategoryName());

                    if (subCategoryId == null) {
                        //TODO : temp workaround, as from UI in case Miscellouns is selected, getting subcategory as Vegetables/Fruits(offline) which is not correct.
                        subCategoryId = 1l;
                    }

                    return new Object[]{req.getPayeeName(), categoryId, subCategoryId,req.getUserId()};
                })
                .toList();

        // Execute batch
        jdbcTemplate.batchUpdate(SAVE_PAYEE_CATEGORY_MAPPING, batchArgs);
    }
}
