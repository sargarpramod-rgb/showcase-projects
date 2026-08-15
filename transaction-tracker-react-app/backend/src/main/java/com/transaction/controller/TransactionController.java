package com.transaction.controller;

import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.*;
import com.transaction.service.CategoryService;
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
import java.io.InputStream;
import java.util.*;

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

    @Autowired
    UploadService uploadService;

    @Autowired
    TransactionFileReaderFactory fileReaderFactory;

    @PostMapping("/transactions")
    public ResponseEntity<Map<String, List<EnhancedTransaction>>> upload
                ( @AuthenticationPrincipal UserPrincipal user,
              @RequestParam("file") MultipartFile file,
             @RequestParam(value = "type", required = false) TransactionFileType typeHint) {
        try {


            Long userId = user.getUserId();
            byte[] bytes = file.getBytes();
            String fileHash = DigestUtils.md5DigestAsHex(bytes);

            // ✅ Create/get upload entry
            Upload upload = uploadService.getOrCreateUpload(
                    userId,
                    file.getOriginalFilename(),
                    fileHash
            );

            Long uploadId = upload.getUploadId();

            // If already saved earlier → reuse DB data
            if (uploadService.shouldReuseFromDb(upload)) {
               /* return ResponseEntity.ok(
                        transactionService.getByUploadId(uploadId)
                );*/
            }


            TransactionFileType resolvedType = fileReaderFactory.resolveType(file, typeHint);
            TransactionFileReaderStrategy strategy = fileReaderFactory.getStrategy(resolvedType);
            List<EnhancedTransaction> tranList = strategy.read(new ByteArrayInputStream(bytes));
            return ResponseEntity.ok(transactionService.updateTransactionDetails(tranList));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        } catch (UnsupportedFileTypeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
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

        //TODO : Observation, in case transaction id is all 0000 it is not getting saved, need to randomize in that case.
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
