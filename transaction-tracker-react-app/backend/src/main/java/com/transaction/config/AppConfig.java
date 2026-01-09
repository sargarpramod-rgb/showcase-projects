package com.transaction.config;

import com.transaction.dao.TransactionDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class AppConfig {

    @Autowired
    private TransactionDao transactionDao;


    @Bean
    public Map<String,Long> categoryMap() {
        return transactionDao.populateCategoryMap();
    }

    @Bean
    public Map<String, Map<String, Long>> subCategoryMap(@Autowired Map<String,Long> categoryMap) {
        return transactionDao.populateSubCategoryMap(categoryMap);
    }

}
