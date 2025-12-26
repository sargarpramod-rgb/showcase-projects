package com.transaction.controller;

import com.github.fracpete.quicken4j.QIFReader;
import com.github.fracpete.quicken4j.Transaction;
import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.*;
import com.transaction.service.CategoryService;
import com.transaction.service.TransactionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toMap;


@RestController
@RequestMapping("/api")
@CrossOrigin
public class TransactionController {

    private static final Logger logger = LoggerFactory.getLogger(TransactionController.class);
    private static final String UPLOAD_DIR = "uploads";

    @Autowired
    private TransactionService transactionService;

    @Autowired
    CategoryService categoryService;

    @PostMapping("/upload-transaction-file")
    public ResponseEntity<Map<String, List<EnhancedTransaction>>> getAllTransactions(@RequestParam("file") MultipartFile file) {
        try {

            var reader = new QIFReader();
            Transactions trans = reader.read(file.getInputStream());
            return ResponseEntity.ok(transactionService.updateTransactionDetails(trans));
        }
        catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }


    @GetMapping("/transaction-categories")
    public ResponseEntity<List<CategoryResponse>> transactionCategories() {
        try {
            List<CategoryResponse>  allCategories = categoryService.getAllCategories();
            return ResponseEntity.ok(allCategories);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }


    @PostMapping("/save-transactions")
    public ResponseEntity<String> saveTransactions(@RequestBody List<AggregatedTransactions> aggregatedTransactions) {

        logger.info("aggregatedTransactions " + aggregatedTransactions);

        // 1. Save Payee to category, sub-category information.
        List<PayeeCategoryResponse> payeeCategoryResponses = new ArrayList<>();

        aggregatedTransactions.forEach(aggregatedTransaction -> {
                    PayeeCategoryResponse payeeCategoryResponse =
                            new PayeeCategoryResponse(aggregatedTransaction.getPayee()
                                    , aggregatedTransaction.getCategory()
                                    , aggregatedTransaction
                                    .getSubcategory());
            payeeCategoryResponses.add(payeeCategoryResponse);
        });

        transactionService.savePayeeCategoryMappings(payeeCategoryResponses);

        // 2. Pass the transaction data
        aggregatedTransactions.stream().forEach(aggregatedTransaction -> {
            transactionService.saveTransactionsBatch(aggregatedTransaction.getEnhancedTransactionList());
        });

        return ResponseEntity.ok("Data Saved Successfully");
    }

    @GetMapping("/transactions-summary-by/{year}")
    public ResponseEntity<List<EnhancedTransaction>> summaryTransactionsByYear(@PathVariable int year) {

        try {
            List<EnhancedTransaction> transactionsByYear = transactionService.getTransactionsByYear(year);
            return ResponseEntity.ok(transactionsByYear);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

}
