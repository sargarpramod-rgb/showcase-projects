package com.transaction.model;


import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode
public class Category {


    private int categoryId;
    private String name;
    //TODO : Move this out and use DTO Map of Category and SubCategories.
    @EqualsAndHashCode.Exclude
    private List<SubCategory> subCategoryList;
}
