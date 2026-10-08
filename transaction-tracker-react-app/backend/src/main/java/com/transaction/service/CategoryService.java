package com.transaction.service;

import com.transaction.dao.TransactionDao;
import com.transaction.model.CategoryResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CategoryService {

    @Autowired
    TransactionDao transactionDao;

    public List<CategoryResponse> getAllCategories() {
        return transactionDao.populateCategoryResponseList();
    }
}
