package com.transaction.service;

import com.transaction.dao.PayeeCategoryRepository;
import com.transaction.model.PayeeCategoryResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PayeeCategoryService {

    @Autowired
    PayeeCategoryRepository payeeCategoryRepository;

    public List<PayeeCategoryResponse> getByUserId(Long userId) {
        return payeeCategoryRepository.getByUserId(userId);
    }

    public void savePayeeCategoryMappings(List<PayeeCategoryResponse> payeeCategoryResponses) {
        payeeCategoryRepository.saveAll(payeeCategoryResponses);
    }
}
