package com.transaction.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PayeeCategoryResponse {

    private String payeeName;
    private String categoryName;
    private String subCategoryName;
}
