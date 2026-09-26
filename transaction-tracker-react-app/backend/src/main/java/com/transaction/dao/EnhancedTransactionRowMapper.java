package com.transaction.dao;

import com.transaction.model.EnhancedTransaction;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;

public class EnhancedTransactionRowMapper implements RowMapper<EnhancedTransaction> {

    @Override
    public EnhancedTransaction mapRow(ResultSet rs, int rowNum) throws SQLException {

            EnhancedTransaction enhancedTransaction = new EnhancedTransaction();

            enhancedTransaction.setTransactionId(rs.getString("transaction_id"));
            enhancedTransaction.setDate(rs.getString("txn_date"));
            enhancedTransaction.setAmount(rs.getDouble("amount"));
            enhancedTransaction.setPayeeFullName(rs.getString("payee_full_name"));
            enhancedTransaction.setPayee(rs.getString("payee"));
            enhancedTransaction.setTxnType(rs.getString("txn_type"));
            enhancedTransaction.setCategory(rs.getString("category_name"));
            enhancedTransaction.setSubcategory(rs.getString("subcategory_name"));

            return enhancedTransaction;
    }
}
