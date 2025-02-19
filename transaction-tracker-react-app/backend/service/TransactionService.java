package com.example.restservice.service;

import com.github.fracpete.quicken4j.QIFReader;
import com.github.fracpete.quicken4j.Transaction;
import com.github.fracpete.quicken4j.Transactions;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    public Map<String, Double> getTransactionsAmountGroupedByPayee(File file) {
        Map<String, Double> transactionData = null;
        try {
            var reader = new QIFReader();
            Transactions trans = null;
            trans = reader.read(file);
            transactionData = trans.stream().map(t -> {

                Map<String, String> values = new HashMap<>();

                values.put("T", t.getAmount().toString());
                values.put("P", t.getPayee().contains("-") ? t.getPayee().split("-")[1] : t.getPayee());

                return new Transaction(values);
            }).collect(Collectors.groupingBy(Transaction::getPayee, Collectors.summingDouble(Transaction::getAmount)));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        return transactionData;
    }
}
