package com.transaction.service;

import com.transaction.dao.TransactionDao;
import com.transaction.model.*;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Clock;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.math.BigDecimal;

import static java.util.stream.Collectors.toMap;

@Service
public class TransactionService {

    private final JdbcTemplate jdbcTemplate;
    private final Clock trendClock;

    @Autowired
    Map<String,Long> categoryMap;

    @Autowired
    Map<String, Map<String, Long>> subcategoryMap;

    @Autowired
    TransactionDao transactionDao;

    @Autowired
    PayeeCategoryService payeeCategoryService;

    @Autowired
    public TransactionService(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, Clock.system(ZoneId.of("Asia/Kolkata")));
    }

    TransactionService(JdbcTemplate jdbcTemplate, Clock trendClock) {
        this.jdbcTemplate = jdbcTemplate;
        this.trendClock = trendClock;
    }

    public List<EnhancedTransaction> getByUploadId(Long uploadId) {
        return transactionDao.getByUploadId(uploadId);
    }

    public List<EnhancedTransaction> getTransactionsByYear(int year, Long userId) {

        return transactionDao.getByYear(year,userId);
    }

    public List<MonthlyTrendData> getMonthlyTrends(int year, Long userId) {
        LocalDate today = LocalDate.now(trendClock);
        if (year < 1 || year > today.getYear()) {
            throw new IllegalArgumentException("Year must be between 1 and the current reporting year");
        }
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = year == today.getYear() ? today.plusDays(1) : start.plusYears(1);
        int months = year == today.getYear() ? today.getMonthValue() : 12;
        return transactionDao.getMonthlyTrends(userId, start, end, months, today);
    }

    public List<YearlyTrendData> getYearlyTrends(Long userId) {
        LocalDate today = LocalDate.now(trendClock);
        return transactionDao.getYearlyTrends(userId, LocalDate.of(1, 1, 1), today.plusDays(1), today);
    }

    public List<CategoryTrendData> getCategoryTrends(int year, Long userId) {
        LocalDate today = LocalDate.now(trendClock);
        if (year < 1 || year > today.getYear()) {
            throw new IllegalArgumentException("Year must be between 1 and the current reporting year");
        }
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = year == today.getYear() ? today.plusDays(1) : start.plusYears(1);
        int months = year == today.getYear() ? today.getMonthValue() : 12;
        return transactionDao.getCategoryTrends(userId, start, end, months);
    }

    @Transactional
    public void savePayeeCategoryMappings(List<PayeeCategoryResponse> mappings) {

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


    // TODO : Normalize the payee before saving, save both the original and normalized payee name.

        /*public String normalizePayee(String payee) {
            if (payee == null) {
                return null;
            }

            return payee.trim()
                    .toUpperCase(Locale.ROOT)
                    .replaceFirst("^(UPI|POS|NEFT|IMPS)[-\\s:/]*", "")
                    .replaceAll("\\b(ORDER|TXN|REF)[-\\s:#]*\\d+\\b", "")
                    .replaceAll("\\s+", " ")
                    .trim();

                    payee_name        = UPI-SWIGGY-923847
            normalized_payee  = SWIGGY
        }*/

    @Transactional
    public void saveTransactionsBatch(List<EnhancedTransaction> transactions, Long uploadId, Long userId) {

        List<Object[]> batchArgs = transactions.stream()
                /*.filter(txn -> Objects.nonNull(txn.getCategory())
                        && Objects.nonNull(txn.getSubcategory()))*/
                .filter(txn -> StringUtils.isNotEmpty(txn.getDate()))
                .map(txn -> {

                    Long categoryId = txn.getCategory() != null ? categoryMap.get(txn.getCategory()) : null;
                    Long subCategoryId = txn.getCategory() != null ? getSubCategoryId(txn.getCategory(), txn.getSubcategory()) : null;

                    String dateString = txn.getDate();

                    // Remove "TXN TIME " and get only the date part
                    String datePart = dateString.split(" TXN TIME ")[0];
                    LocalDate localDate = null;
                    // Define possible formatters
                    List<DateTimeFormatter> formatters = Arrays.asList(
                            DateTimeFormatter.ofPattern("MM-dd-yyyy"), // e.g. 07-01-2025
                            DateTimeFormatter.ofPattern("dd/MM/yy"),    // e.g. 01/06/25
                            DateTimeFormatter.ofPattern("yyyy-MM-dd")
                    );

                    for (DateTimeFormatter formatter : formatters) {
                        try {
                            localDate = LocalDate.parse(datePart, formatter);
                        } catch (DateTimeParseException e) {
                            // try next formatter
                        }
                    }


                    return new Object[]{
                            txn.getTransactionId(),
                            userId,
                            uploadId,
                            localDate,
                            dateString,
                            txn.getPayee(),
                            txn.getPayeeFullName(),
                            txn.getAmount(),
                            txn.getTxnType(),
                            categoryId,
                            subCategoryId
                    };
                })
                .toList();

        transactionDao.saveTransactions(batchArgs);



        //transactionDao.saveAll();
    }

// TODO : check why subategory map not getting populated as expected, resulting in
    // this workaround.
    private long getSubCategoryId(String categoryName, String subCategoryName) {
        Map<String, Map<String, Long>> subCategoryMap1 = jdbcTemplate.query(
                "SELECT id, category_id, name FROM subcategories",
                rs -> {
                    Map<String, Map<String, Long>> map = new HashMap<>();
                    while (rs.next()) {
                        Long categoryId1 = rs.getLong("category_id");
                        String subName = rs.getString("name");
                        Long subId = rs.getLong("id");

                        String catName = categoryMap.entrySet()
                                .stream()
                                .filter(e -> e.getValue().equals(categoryId1))
                                .map(Map.Entry::getKey)
                                .findFirst()
                                .orElse(null);

                        map.computeIfAbsent(catName, k -> new HashMap<>())
                                .put(subName, subId);
                    }
                    return map;
                }
        );


        Long subCategoryId = subCategoryMap1.getOrDefault(categoryName, Map.of())
                .get(subCategoryName);

        if (subCategoryId == null) {
            //TODO : temp workaround, as from UI in case Miscellouns is selected, getting subcategory as Vegetables/Fruits(offline) which is not correct.
            subCategoryId = 1l;
        }

        return  subCategoryId;
    }


    public void updateTransactionDetails(List<EnhancedTransaction> trans, Long userId) {

        List<PayeeCategoryResponse> payeeCategoryResponseList = payeeCategoryService.getByUserId(userId);

        trans.forEach(t -> {

            if (payeeCategoryResponseList != null && !payeeCategoryResponseList.isEmpty()) {
                Optional<PayeeCategoryResponse> optionalPayeeCategoryResponse = payeeCategoryResponseList.stream()
                        .filter(payeeCategoryResponse -> payeeCategoryResponse.getPayeeName()
                                .equalsIgnoreCase(t.getPayee()))
                        .findAny();

                optionalPayeeCategoryResponse.ifPresent(payeeCategoryResponse -> {
                    t.setCategory(payeeCategoryResponse.getCategoryName());
                    t.setSubcategory(payeeCategoryResponse.getSubCategoryName());
                });
            }
        });

        //return getTransactionsByPayeeSortedByAmount(trans);
    }




}
