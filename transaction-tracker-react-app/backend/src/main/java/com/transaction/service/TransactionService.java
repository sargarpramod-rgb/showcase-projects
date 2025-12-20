package com.transaction.service;

import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toMap;

@Service
public class TransactionService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    Map<String,Long> categoryMap;

    @Autowired
    Map<String, Map<String, Long>> subcategoryMap;

    @Autowired
    public TransactionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<PayeeCategoryResponse> getPayeeCategoryMappings() {

        String sql = """
                SELECT 
                    pc.payee_name,
                    c.name AS category_name,
                    sc.name AS subcategory_name
                FROM payee_category_mapping pc
                JOIN categories c
                    ON pc.category_id = c.id
                JOIN subcategories sc
                    ON pc.subcategory_id = sc.id
                where pc.category_id = sc.category_id
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) ->
                new PayeeCategoryResponse(rs.getString("payee_name"),
                rs.getString("category_name"),
                rs.getString("subcategory_name")));
    }

    @Transactional
    public void savePayeeCategoryMappings(List<PayeeCategoryResponse> mappings) {

     /*   String sql = """
        INSERT INTO payee_category_mapping
        (payee_name, category_id, subcategory_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        category_id = VALUES(category_id),
        subcategory_id = VALUES(subcategory_id)
    """;*/

        String sql = """
                MERGE INTO payee_category_mapping (payee_name, category_id, subcategory_id)
                KEY (payee_name)
                VALUES (?, ?, ?);
    """;

        // Resolve names to IDs first
        List<Object[]> batchArgs = mappings.stream()
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

                    return new Object[]{req.getPayeeName(), categoryId, subCategoryId};
                })
                .toList();

        // Execute batch
        jdbcTemplate.batchUpdate(sql, batchArgs);
    }


    @Transactional
    public void saveTransactionsBatch(List<EnhancedTransaction> transactions) {


        List<Object[]> batchArgs = transactions.stream()
                .map(txn -> {
                    Long categoryId = categoryMap.get(txn.getCategory());
                    Long subCategoryId = subcategoryMap.getOrDefault(txn.getCategory(), Map.of())
                            .get(txn.getSubcategory());

                    return new Object[]{
                            txn.getTransactionId(),
                            txn.getDate(),
                            txn.getPayee(),
                            txn.getPayeeFullName(),
                            txn.getAmount(),
                            txn.getTxnType(),
                            categoryId,
                            subCategoryId
                    };
                })
                .toList();

        // 4️⃣ Batch insert
        String sql = """
        INSERT INTO transactions
        (transaction_id, txn_date, payee, payee_full_name, amount, txn_type, category_id, subcategory_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        payee = VALUES(payee),
        payee_full_name = VALUES(payee_full_name),
        amount = VALUES(amount),
        txn_type = VALUES(txn_type),
        category_id = VALUES(category_id),
        subcategory_id = VALUES(subcategory_id)
        """;

        jdbcTemplate.batchUpdate(sql, batchArgs);
    }


    public LinkedHashMap<String, List<EnhancedTransaction>> updateTransactionDetails(Transactions trans) {

        Map<String, List<EnhancedTransaction>> transactionData = trans.stream().map(t -> {

            EnhancedTransaction newTransaction = new EnhancedTransaction();
            String transactionAmount = t.getValue("M");

            newTransaction.setTransactionId(t.getNumber());
            newTransaction.setDate(t.getValue("D") + " " +
                    transactionAmount.substring(transactionAmount.indexOf("MTXN TIME ")+1));
            newTransaction.setAmount(t.getAmount());
            newTransaction.setPayeeFullName(t.getPayee().contains("-") &&
                    t.getPayee().contains("@") ?t.getPayee().substring(t.getPayee().indexOf("-")+1,t.getPayee().indexOf("@"))
                    : t.getPayee());
           String payeeName= t.getPayee().contains("-") ? t.getPayee().split("-")[1].trim(): t.getPayee().trim();
            newTransaction.setPayee(payeeName);
            newTransaction.setTxnType(newTransaction.getAmount()<0?"Debit":"Credit");

            List<PayeeCategoryResponse> payeeCategoryResponseList = getPayeeCategoryMappings();

            if (payeeCategoryResponseList != null && !payeeCategoryResponseList.isEmpty()) {
                Optional<PayeeCategoryResponse> optionalPayeeCategoryResponse = payeeCategoryResponseList.stream()
                        .filter(payeeCategoryResponse -> payeeCategoryResponse.getPayeeName()
                                .equalsIgnoreCase(payeeName))
                        .findAny();

                optionalPayeeCategoryResponse.ifPresent(payeeCategoryResponse -> {
                    newTransaction.setCategory(payeeCategoryResponse.getCategoryName());
                    newTransaction.setSubcategory(payeeCategoryResponse.getSubCategoryName());
                });
            }

            return newTransaction;
        }).collect(Collectors.groupingBy(EnhancedTransaction::getPayee));

        // Flatten and sort all transactions by amount after grouping
        LinkedHashMap<String, List<EnhancedTransaction>> transactionMap = transactionData.entrySet().stream()
                .sorted(Comparator.comparingDouble(e -> e.getValue().stream().mapToDouble(EnhancedTransaction::getAmount).sum()))
                .collect(toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        LinkedHashMap::new // Preserve sorted order
                ));

        return transactionMap;
    }


}
