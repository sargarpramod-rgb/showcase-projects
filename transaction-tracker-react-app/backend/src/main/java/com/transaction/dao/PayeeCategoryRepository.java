package com.transaction.dao;

import com.transaction.model.PayeeCategoryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
@RequiredArgsConstructor
@Log4j2
public class PayeeCategoryRepository {

    private final JdbcTemplate jdbcTemplate;

    //@Autowired
    Map<String,Long> categoryMap;

    private static final String GET_PAYEE_CATEGORY_MAPPING_BY_USER_ID =  """
              SELECT
              pc.payee_name,
              pc.user_id,
              c.id AS category_id,
              sc.id AS subcategory_id
              FROM payee_category_mapping pc
                JOIN categories c
              ON pc.category_id = c.id
                JOIN subcategories sc
              ON pc.category_id= sc.category_id
              AND pc.subcategory_id=sc.id
              where pc.user_id = ?
                """;


    private static final String SAVE_PAYEE_CATEGORY_MAPPING = """
                INSERT INTO payee_category_mapping (payee_name, category_id, subcategory_id, user_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (payee_name) DO UPDATE SET
                    category_id = EXCLUDED.category_id,
                    subcategory_id = EXCLUDED.subcategory_id,
                    user_id = EXCLUDED.user_id;
    """;

    public List<PayeeCategoryResponse> getByUserId(Long userId) {

        return jdbcTemplate.query(GET_PAYEE_CATEGORY_MAPPING_BY_USER_ID, new Object[]{userId}, (rs, rowNum) ->
                new PayeeCategoryResponse(rs.getString("payee_name"),
                        rs.getLong("category_id"),
                        rs.getLong("subcategory_id"),
                        rs.getLong("user_id")));
    }

    public void saveAll(Set<PayeeCategoryResponse> payeeCategoryResponses) {

        // Persist the selected IDs
        List<Object[]> batchArgs = payeeCategoryResponses.stream()
                .filter(req -> Objects.nonNull(req.getCategoryId())
                        && Objects.nonNull(req.getSubCategoryId()))
                .map(req -> {
                    return new Object[]{req.getPayeeName(), req.getCategoryId(),
                            req.getSubCategoryId(), req.getUserId()};
                })
                .toList();

        // Execute batch
        jdbcTemplate.batchUpdate(SAVE_PAYEE_CATEGORY_MAPPING, batchArgs);
    }
}
