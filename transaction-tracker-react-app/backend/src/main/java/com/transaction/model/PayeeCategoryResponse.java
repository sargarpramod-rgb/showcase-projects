package com.transaction.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@AllArgsConstructor
@EqualsAndHashCode
public class PayeeCategoryResponse {

    private String payeeName;
    private Long categoryId;
    private Long subCategoryId;
    private Long userId;

}
