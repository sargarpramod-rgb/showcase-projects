package com.transaction.service;

import com.transaction.dao.TransactionDao;
import com.transaction.model.*;
import com.transaction.util.TransactionUtil;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Clock;
import java.time.ZoneId;
import java.util.*;

import static java.util.stream.Collectors.toMap;

@Service
public class TransactionService {

    private final JdbcTemplate jdbcTemplate;
    private final Clock trendClock;

    //@Autowired
    Map<String,Long> categoryMap;

    //@Autowired
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

    public void updateTransactionDetails(List<EnhancedTransaction> trans, Long userId) {

        List<PayeeCategoryResponse> payeeCategoryResponseList = payeeCategoryService.getByUserId(userId);

        trans.forEach(t -> {

            if (payeeCategoryResponseList != null && !payeeCategoryResponseList.isEmpty()) {
                Optional<PayeeCategoryResponse> optionalPayeeCategoryResponse = payeeCategoryResponseList.stream()
                        .filter(payeeCategoryResponse -> payeeCategoryResponse.getPayeeName()
                                .equalsIgnoreCase(t.getPayee()))
                        .findAny();

                optionalPayeeCategoryResponse.ifPresent(payeeCategoryResponse -> {
                    t.setCategory(payeeCategoryResponse.getCategoryId());
                    t.setSubcategory(payeeCategoryResponse.getSubCategoryId());
                });
            }
        });

        //return getTransactionsByPayeeSortedByAmount(trans);
    }


    @Transactional
    public void saveTransactions(Long userId,SaveTransactionsRequest saveTransactionsRequest) {

        Set<PayeeCategoryResponse> mappings = new HashSet<>();
        List<Object[]> rows = new ArrayList<>();

        saveTransactionsRequest.transactions().stream()
                        .filter(txn -> txn.getCategory() != null
                                && txn.getSubcategory() != null)
                        .forEach(txn -> {
                                    mappings.add(new PayeeCategoryResponse(txn.getPayee()
                                            , txn.getCategory()
                                            , txn.getSubcategory(),
                                            userId));
                                });

        saveTransactionsRequest.transactions().stream()
                .filter(txn -> StringUtils.isNotBlank(txn.getTransactionId()))
                .forEach(txn -> {
                    rows.add(new Object[] {
                            txn.getTransactionId(),
                            userId,
                            saveTransactionsRequest.uploadId(),
                            TransactionUtil.getTransactionLocalDate(txn.getDate()),
                            txn.getDate(),
                            txn.getPayee(),
                            txn.getPayeeFullName(),
                            txn.getAmount(),
                            txn.getTxnType(),
                            txn.getCategory(),
                            txn.getSubcategory()
                    });
                });

        payeeCategoryService.savePayeeCategoryMappings(mappings);
        transactionDao.saveTransactions(rows);
    }
}
