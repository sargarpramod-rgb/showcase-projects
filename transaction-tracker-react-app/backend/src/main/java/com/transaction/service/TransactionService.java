package com.transaction.service;

import com.transaction.dao.TransactionDao;
import com.transaction.model.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.math.BigDecimal;

import static java.util.stream.Collectors.toMap;

@Service
public class TransactionService {

    private final JdbcTemplate jdbcTemplate;

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
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<EnhancedTransaction> getByUploadId(Long uploadId) {
        return transactionDao.getByUploadId(uploadId);
    }

    public List<EnhancedTransaction> getTransactionsByYear(int year, Long userId) {

        return transactionDao.getByYear(year,userId);
    }

    public List<MonthlyTrendData> getMonthlyTrends(int year, Long userId) {
        List<EnhancedTransaction> transactions = transactionDao.getByYear(year, userId);
        return calculateMonthlyTrends(transactions);
    }

    public List<YearlyTrendData> getYearlyTrends(Long userId) {
        List<EnhancedTransaction> transactions = transactionDao.getByUserId(userId);
        return calculateYearlyTrends(transactions);
    }

    private List<MonthlyTrendData> calculateMonthlyTrends(List<EnhancedTransaction> transactions) {
        Map<String, MonthlyTrendData> monthlyMap = new LinkedHashMap<>();
        
        // Initialize all 12 months
        String[] months = {"January", "February", "March", "April", "May", "June", 
                          "July", "August", "September", "October", "November", "December"};
        
        int currentYear = transactions.isEmpty() ? java.time.Year.now().getValue() : 
                         LocalDate.parse(transactions.get(0).getDate().split(" TXN TIME ")[0],
                         DateTimeFormatter.ofPattern("MM-dd-yyyy")).getYear();
        
        for (String month : months) {
            monthlyMap.put(month, new MonthlyTrendData(month, currentYear, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
        }

        // Process transactions
        for (EnhancedTransaction txn : transactions) {
            try {
                String dateString = txn.getDate().split(" TXN TIME ")[0];
                LocalDate date = null;
                
                List<DateTimeFormatter> formatters = Arrays.asList(
                        DateTimeFormatter.ofPattern("MM-dd-yyyy"),
                        DateTimeFormatter.ofPattern("dd/MM/yy")
                );

                for (DateTimeFormatter formatter : formatters) {
                    try {
                        date = LocalDate.parse(dateString, formatter);
                        break;
                    } catch (DateTimeParseException e) {
                        // try next formatter
                    }
                }

                if (date != null) {
                    String monthName = months[date.getMonthValue() - 1];
                    MonthlyTrendData trendData = monthlyMap.get(monthName);

                    BigDecimal amount = new BigDecimal(txn.getAmount());
                    if ("INCOME".equalsIgnoreCase(txn.getTxnType())) {
                        trendData.addIncome(amount);
                    } else if ("INVESTMENT".equalsIgnoreCase(txn.getTxnType())) {
                        trendData.addInvestment(amount);
                    } else {
                        trendData.addExpense(amount);
                    }
                }
            } catch (Exception e) {
                // Skip malformed transactions
            }
        }

        return new ArrayList<>(monthlyMap.values());
    }

    private List<YearlyTrendData> calculateYearlyTrends(List<EnhancedTransaction> transactions) {
        Map<Integer, YearlyTrendData> yearlyMap = new TreeMap<>((a, b) -> Integer.compare(b, a)); // Sort descending
        
        for (EnhancedTransaction txn : transactions) {
            try {
                String dateString = txn.getDate().split(" TXN TIME ")[0];
                LocalDate date = null;
                
                List<DateTimeFormatter> formatters = Arrays.asList(
                        DateTimeFormatter.ofPattern("MM-dd-yyyy"),
                        DateTimeFormatter.ofPattern("dd/MM/yy")
                );

                for (DateTimeFormatter formatter : formatters) {
                    try {
                        date = LocalDate.parse(dateString, formatter);
                        break;
                    } catch (DateTimeParseException e) {
                        // try next formatter
                    }
                }

                if (date != null) {
                    int year = date.getYear();
                    YearlyTrendData trendData = yearlyMap.computeIfAbsent(year, 
                            k -> new YearlyTrendData(year, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));

                    BigDecimal amount = new BigDecimal(txn.getAmount());
                    if ("INCOME".equalsIgnoreCase(txn.getTxnType())) {
                        trendData.addIncome(amount);
                    } else if ("INVESTMENT".equalsIgnoreCase(txn.getTxnType())) {
                        trendData.addInvestment(amount);
                    } else {
                        trendData.addExpense(amount);
                    }
                    
                    trendData.setTransactionCount(trendData.getTransactionCount() + 1);
                }
            } catch (Exception e) {
                // Skip malformed transactions
            }
        }

        return new ArrayList<>(yearlyMap.values());
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
    public void saveTransactionsBatch(List<EnhancedTransaction> transactions, Long userId) {

        List<Object[]> batchArgs = transactions.stream()
                .filter(txn -> Objects.nonNull(txn.getCategory())
                        && Objects.nonNull(txn.getSubcategory()))
                .map(txn -> {
                    Long categoryId = categoryMap.get(txn.getCategory());
                    Long subCategoryId = getSubCategoryId(txn.getCategory(), txn.getSubcategory());

                    String dateString = txn.getDate();

                    // Remove "TXN TIME " and get only the date part
                    String datePart = dateString.split(" TXN TIME ")[0];
                    LocalDate localDate = null;
                    // Define possible formatters
                    List<DateTimeFormatter> formatters = Arrays.asList(
                            DateTimeFormatter.ofPattern("MM-dd-yyyy"), // e.g. 07-01-2025
                            DateTimeFormatter.ofPattern("dd/MM/yy")    // e.g. 01/06/25
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

        String sql = """
                MERGE INTO transactions (transaction_id,user_id, txn_date,txn_date_str, payee, payee_full_name, amount, txn_type, category_id, subcategory_id)
                KEY(transaction_id)
                VALUES (?, ?,?, ?,?, ?, ?, ?, ?, ?);
                
        """;

        jdbcTemplate.batchUpdate(sql, batchArgs);

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
