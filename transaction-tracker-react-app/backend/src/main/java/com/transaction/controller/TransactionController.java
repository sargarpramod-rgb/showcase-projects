package com.transaction.controller;

import com.github.fracpete.quicken4j.QIFReader;
import com.github.fracpete.quicken4j.Transaction;
import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.AggregatedTransactions;
import com.transaction.model.EnhancedTransaction;
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

            // TODO : Move this logic to Service.
            Map<String, List<EnhancedTransaction>> transactionData = trans.stream().map(t -> {

                EnhancedTransaction newTransaction = new EnhancedTransaction();


                String transactionAmount = t.getValue("M");

                newTransaction.setDate(t.getValue("D") + " " +
                        transactionAmount.substring(transactionAmount.indexOf("MTXN TIME ")+1));
                newTransaction.setAmount(t.getAmount());
                newTransaction.setPayeeFullName(t.getPayee().contains("-") && t.getPayee().contains("@") ?t.getPayee().substring(t.getPayee().indexOf("-")+1,t.getPayee().indexOf("@")) : t.getPayee());
                newTransaction.setPayee(t.getPayee().contains("-") ? t.getPayee().split("-")[1].trim(): t.getPayee().trim());
                newTransaction.setTxnType(newTransaction.getAmount()<0?"Debit":"Credit");
                if(!payeeToCategoryMapping.isEmpty()) {

                    String categorySubCategoryData = payeeToCategoryMapping.get(newTransaction.getPayee());

                    if(categorySubCategoryData!=null) {

                        String[] split = categorySubCategoryData.split("\\|");

                        newTransaction.setCategory(split[0]);
                        newTransaction.setSubcategory(split[1]);
                    }
                }

                return newTransaction;
            }).collect(Collectors.groupingBy(EnhancedTransaction::getPayee));



            // Flatten and sort all transactions by amount after grouping
            LinkedHashMap<String, List<EnhancedTransaction>> collect = transactionData.entrySet().stream()
                    .sorted(Comparator.comparingDouble(e -> e.getValue().stream().mapToDouble(EnhancedTransaction::getAmount).sum()))
                    .collect(toMap(
                            Map.Entry::getKey,
                            Map.Entry::getValue,
                            (e1, e2) -> e1,
                            LinkedHashMap::new // Preserve sorted order
                    ));

            return ResponseEntity.ok(collect);
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


    @GetMapping("/transactions-by-payee")
    public ResponseEntity<Map<String, Double>> extractTransactions(@RequestParam("fileName") String fileName) {
        try {
            File file = new File(UPLOAD_DIR + "/" + fileName);
            Map<String, Double> transactionData = transactionService.getTransactionsAmountGroupedByPayee(file);


            return ResponseEntity.ok(transactionData);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/save-transactions")
    public ResponseEntity<String> saveTransactions(@RequestBody List<AggregatedTransactions> aggregatedTransactions) {

        logger.info("aggregatedTransactions " + aggregatedTransactions);

        // 1. Save Payee to category, sub-category information.

        // 2. Pass the transaction data

        StringBuffer stringBuffer = new StringBuffer();

        aggregatedTransactions.forEach(aggregatedTransaction -> {
            stringBuffer.append(aggregatedTransaction.getPayee());
            stringBuffer.append("|");
            stringBuffer.append(aggregatedTransaction.getCategory());
            stringBuffer.append("|");
            stringBuffer.append(aggregatedTransaction.getSubcategory());
            stringBuffer.append("|");
            stringBuffer.append("\n");
        });


        try {
            Path filePath = Path.of(UPLOAD_DIR, fileName);
            Files.writeString(filePath, stringBuffer.toString());
            populatePayeeMap();
            ResponseEntity.ok("Data Saved Successfully");
        } catch (IOException e) {
            logger.error("Exception while saving the data {}", String.valueOf(e.getCause()));
            ResponseEntity.internalServerError().body("Error while saving the data");
        }

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
