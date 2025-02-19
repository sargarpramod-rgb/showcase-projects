package com.example.restservice.controller;

import com.example.restservice.service.TransactionService;
import com.github.fracpete.quicken4j.QIFReader;
import com.github.fracpete.quicken4j.Transaction;
import com.github.fracpete.quicken4j.Transactions;
import org.apache.pdfbox.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.text.PDFTextStripper;
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


@RestController
@RequestMapping("/api")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    private static final String UPLOAD_DIR = "uploads";

    private static final Logger logger = LoggerFactory.getLogger(TransactionController.class);

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
}
