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

    @Autowired
    private TransactionService transactionService;

    @Autowired
    CategoryService categoryService;

    private static final String UPLOAD_DIR = "uploads";
    private static final String fileName = "payeeMapping.txt";

    private static final Logger logger = LoggerFactory.getLogger(TransactionController.class);

    private static  Map<String, String> payeeToCategoryMapping = new HashMap<>();

    @GetMapping("/message")
    public String getMessage() {
        return "Hello from Spring Boot!";
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // Ensure upload directory exists
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdir();
            }

            // Save file to server
            Path filePath = Path.of(UPLOAD_DIR, Objects.requireNonNull(file.getOriginalFilename()));
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok("File Uploaded Successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Exception while uploading file, " +
                    "please try again!!!");
        }
    }

    @PostMapping("/upload-transaction-file")
    public ResponseEntity<Map<String, List<EnhancedTransaction>>> getAllTransactions(@RequestParam("file") MultipartFile file) {
        try {
            // Ensure upload directory exists
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdir();
            }

            // Save file to server
            Path filePath = Path.of(UPLOAD_DIR, Objects.requireNonNull(file.getOriginalFilename()));
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            var reader = new QIFReader();
            Transactions trans = reader.read(filePath.toFile());
            return ResponseEntity.ok(transactionService.updateTransactionDetails(trans));
        }
        catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }



    @PostMapping("/all-transactions")
    public ResponseEntity<Map<String, List<Transaction>>> getAllTransactions(@RequestParam("fileName") String fileName) {
        try {
                var reader = new QIFReader();
                Transactions trans = reader.read(Path.of(UPLOAD_DIR, Objects.requireNonNull(fileName)).toFile());

                // TODO : Move this logic to Service.
                Map<String, List<Transaction>> transactionData = trans.stream().map(t -> {

                    Map<String, String> values = new HashMap<>();

                    values.put("D", String.valueOf(t.getDate()));
                    values.put("T", t.getAmount().toString());
                    values.put("P", t.getPayee().contains("-") ? t.getPayee().split("-")[1]: t.getPayee());

                    return new Transaction(values);
                }).collect(Collectors.groupingBy(Transaction::getPayee));


                return ResponseEntity.ok(transactionData);
            }
        catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }


    /*@GetMapping("/transactions-by-payee")
    public ResponseEntity<Map<String, Double>> extractTransactions(@RequestParam("fileName") String fileName) {
        try {
            File file = new File(UPLOAD_DIR + "/" + fileName);
            Map<String, Double> transactionData = transactionService.getTransactionsAmountGroupedByPayee(file);


            return ResponseEntity.ok(transactionData);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }*/


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


    private static void populatePayeeMap() {
        Path payeeMappingFilePath = Path.of(UPLOAD_DIR, fileName);

        if(Files.exists(payeeMappingFilePath)) {
            try {
                List<String> lines = Files.readString(payeeMappingFilePath).lines().toList();

                // Convert list to map
                payeeToCategoryMapping = lines.stream()
                        .map(line -> line.split("\\|", 2))  // Split only on the first "|"
                        .filter(parts -> parts.length == 2) // Ensure valid splits
                        .collect(Collectors.toMap(
                                parts -> parts[0].trim(),      // Key: first part (before "|")
                                parts -> parts[1].trim()       // Value: remaining part
                        ));

            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
