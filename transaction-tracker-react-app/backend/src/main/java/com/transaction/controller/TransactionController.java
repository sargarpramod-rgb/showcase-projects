package com.transaction.controller;

import com.transaction.model.*;
import com.transaction.service.CategoryService;
import com.transaction.service.PayeeCategoryService;
import com.transaction.service.TransactionService;
import com.transaction.service.UploadService;
import com.transaction.upload.TransactionFileReaderFactory;
import com.transaction.upload.TransactionFileReaderStrategy;
import com.transaction.upload.TransactionFileType;
import com.transaction.upload.UnsupportedFileTypeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.DigestUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;

import static com.transaction.util.TransactionUtil.getTransactionsByPayeeSortedByAmount;


@RestController
@RequestMapping("/api")
@CrossOrigin
public class TransactionController {

    private static final Logger logger = LoggerFactory.getLogger(TransactionController.class);
    private static final String UPLOAD_DIR = "uploads";

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private PayeeCategoryService payeeCategoryService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    UploadService uploadService;

    @Autowired
    TransactionFileReaderFactory fileReaderFactory;

    //TODO: Create another endpoint to upload files directly to s3 , in case it is very big file.

    @PostMapping("/transactions/upload")
    public ResponseEntity<UploadResponse> upload
            (@AuthenticationPrincipal UserPrincipal user,
             @RequestParam("file") MultipartFile file,
             @RequestParam(value = "type", required = false) TransactionFileType typeHint) {
        try {

            Long userId = user.getUserId();
            byte[] bytes = file.getBytes();
            String fileHash = DigestUtils.md5DigestAsHex(bytes);

            Upload upload = uploadService.getOrCreateUpload(
                    userId,
                    file.getOriginalFilename(),
                    fileHash
            );

            Long uploadId = upload.getUploadId();

            if (uploadService.shouldReuseFromDb(upload)) {
                List<EnhancedTransaction> enhancedTransactionList =
                        transactionService.getByUploadId(uploadId);

                UploadResponse response = new UploadResponse(
                        upload.getUploadId(),
                        file.getOriginalFilename(),
                        UploadStatus.SUCCESS,
                        enhancedTransactionList
                );

                return ResponseEntity.ok(response);
            }

            TransactionFileType resolvedType = fileReaderFactory.resolveType(file, typeHint);
            TransactionFileReaderStrategy strategy = fileReaderFactory.getStrategy(resolvedType);
            List<EnhancedTransaction> tranList = strategy.read(new ByteArrayInputStream(bytes));
            transactionService.updateTransactionDetails(tranList, userId);


            UploadResponse response = new UploadResponse(
                    upload.getUploadId(),
                    file.getOriginalFilename(),
                    UploadStatus.PREVIEW,
                    tranList
            );

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        } catch (UnsupportedFileTypeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }


    @GetMapping("/transaction-categories")
    public ResponseEntity<List<CategoryResponse>> transactionCategories() {
        try {
            List<CategoryResponse> allCategories = categoryService.getAllCategories();
            return ResponseEntity.ok(allCategories);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }


    @PostMapping("/transactions/save")
    public ResponseEntity<String> saveTransactions(@AuthenticationPrincipal UserPrincipal user,
                                                   @RequestBody SaveTransactionsRequest request) {

        List<AggregatedTransactions> aggregatedTransactions = request.aggregatedData();

        // 1. Save Payee to category, sub-category information.
        List<PayeeCategoryResponse> payeeCategoryResponses = new ArrayList<>();

        aggregatedTransactions.forEach(aggregatedTransaction -> {
            PayeeCategoryResponse payeeCategoryResponse =
                    new PayeeCategoryResponse(aggregatedTransaction.getPayee()
                            , aggregatedTransaction.getCategory()
                            , aggregatedTransaction
                            .getSubcategory(), user.getUserId());
            payeeCategoryResponses.add(payeeCategoryResponse);
        });

        payeeCategoryService.savePayeeCategoryMappings(payeeCategoryResponses);

        // 2. Pass the transaction data
        aggregatedTransactions.forEach(aggregatedTransaction -> {
            transactionService.saveTransactionsBatch(aggregatedTransaction.getEnhancedTransactionList(),
                    request.uploadId(), user.getUserId());
        });

        uploadService.markSuccess(request.uploadId());

        return ResponseEntity.ok("Data Saved Successfully");
    }

    @GetMapping("/transactions-summary-by/{year}")
    public ResponseEntity<List<EnhancedTransaction>> summaryTransactionsByYear(@AuthenticationPrincipal UserPrincipal user,
                                                                               @PathVariable int year) {

        try {
            List<EnhancedTransaction> transactionsByYear = transactionService.getTransactionsByYear(year, user.getUserId());
            return ResponseEntity.ok(transactionsByYear);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/transactions-trend/monthly/{year}")
    public ResponseEntity<List<MonthlyTrendData>> monthlyTrends(@AuthenticationPrincipal UserPrincipal user,
                                                                @PathVariable int year) {

        try {
            List<MonthlyTrendData> monthlyTrends = transactionService.getMonthlyTrends(year, user.getUserId());
            return ResponseEntity.ok(monthlyTrends);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error fetching monthly trends", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/transactions-trend/yearly")
    public ResponseEntity<List<YearlyTrendData>> yearlyTrends(@AuthenticationPrincipal UserPrincipal user) {

        try {
            List<YearlyTrendData> yearlyTrends = transactionService.getYearlyTrends(user.getUserId());
            return ResponseEntity.ok(yearlyTrends);
        } catch (Exception e) {
            logger.error("Error fetching yearly trends", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/transactions-trend/categories/{year}")
    public ResponseEntity<List<CategoryTrendData>> categoryTrends(@AuthenticationPrincipal UserPrincipal user,
                                                                   @PathVariable int year) {
        try {
            return ResponseEntity.ok(transactionService.getCategoryTrends(year, user.getUserId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error fetching category trends", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}
