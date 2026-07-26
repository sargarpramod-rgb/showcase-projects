package com.transaction.upload.strategy;

import com.github.fracpete.quicken4j.QIFReader;
import com.github.fracpete.quicken4j.Transactions;
import com.transaction.model.EnhancedTransaction;
import com.transaction.model.PayeeCategoryResponse;
import com.transaction.upload.TransactionFileReaderStrategy;
import com.transaction.upload.TransactionFileType;
import com.transaction.util.TransactionUtil;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class QifTransactionFileReaderStrategy implements TransactionFileReaderStrategy {

    @Override
    public List<EnhancedTransaction> read(InputStream inputStream) throws IOException {
        Transactions transactions =  new QIFReader().read(inputStream);

        List<EnhancedTransaction> enhancedTransactionList = transactions.stream().map(t -> {

            EnhancedTransaction newTransaction = new EnhancedTransaction();
            String transactionAmount = t.getValue("M");

            newTransaction.setDate(t.getValue("D") + " " +
                    transactionAmount.substring(transactionAmount.indexOf("MTXN TIME ") + 1));

            if (t.getNumber().trim().equalsIgnoreCase("000000000000000")) {
                // case of transaction id being 0 which is causing issue while getting saved to the database.

                String tranId = StringUtils.leftPad(StringUtils.joinWith("",
                                t.getValue("D").replace("-", ""),
                                transactionAmount.substring(9).replace(":", "")),
                        16, "0");


                System.out.println("tranId" + tranId);
                newTransaction.setTransactionId(tranId);
            } else {
                newTransaction.setTransactionId(t.getNumber());
            }
            newTransaction.setAmount(t.getAmount());
            TransactionUtil.setPayeeDetails(newTransaction,t.getPayee());
            /*newTransaction.setPayeeFullName(t.getPayee().contains("-") &&
                    t.getPayee().contains("@") ? t.getPayee().substring(t.getPayee().indexOf("-") + 1, t.getPayee().indexOf("@"))
                    : t.getPayee());
            String payeeName = t.getPayee().contains("-") ? t.getPayee().split("-")[1].trim() : t.getPayee().trim();
            newTransaction.setPayee(payeeName);*/
            newTransaction.setTxnType(newTransaction.getAmount() < 0 ? "Debit" : "Credit");
            return newTransaction;
        }).toList();

        return enhancedTransactionList;
    }

    @Override
    public boolean supports(TransactionFileType type) {
        return type == TransactionFileType.QIF;
    }
}