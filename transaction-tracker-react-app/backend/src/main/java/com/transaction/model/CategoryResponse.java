package com.transaction.model;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CategoryResponse {
    private Long categoryId;
    private String categoryName;
    private List<SubCategory> subCategories = new ArrayList<>();
}
