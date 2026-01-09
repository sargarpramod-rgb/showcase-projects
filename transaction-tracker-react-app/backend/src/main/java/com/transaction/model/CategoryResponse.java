package com.transaction.model;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class CategoryResponse {
    private String categoryName;
    private List<String> subCategories;
}
