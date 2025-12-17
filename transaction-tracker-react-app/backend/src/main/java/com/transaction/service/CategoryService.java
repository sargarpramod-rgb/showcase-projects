package com.transaction.service;

import com.transaction.model.Category;
import com.transaction.model.SubCategory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Stream;

@Service
public class CategoryService {

    private final DataSource dataSource;

    @Autowired
    public CategoryService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public List<Category> getAllCategories() {
        List<String> categories = new ArrayList<>();
        String sql = "SELECT c.id,c.name,sc.name\n" +
                "FROM trn_dbo.categories c\n" +
                "join trn_dbo.subcategories sc\n" +
                "on c.id=sc.category_id";

        List<Category> categoryList = new ArrayList<>();

        // Spring Boot automatically manages the connection pool via the configured DataSource
        try (Connection conn = dataSource.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {

                String categoryName = rs.getString("c.name");

                Optional<Category> existingCategory = categoryList.stream()
                        .filter(c -> c.getName().equals(categoryName))
                        .findFirst();
                SubCategory subCategory = new SubCategory();
                subCategory.setName(rs.getString("sc.name"));
                if(existingCategory.isPresent()) {
                    existingCategory.get().getSubCategoryList().add(subCategory);
                } else {
                    Category category = new Category();
                    category.setName(categoryName);
                    List<SubCategory> subCategoryList = new ArrayList<>();
                    subCategoryList.add(subCategory);
                    category.setSubCategoryList(subCategoryList);
                    categoryList.add(category);
                }

            }

        } catch (SQLException e) {
            e.printStackTrace();
            // Handle exceptions appropriately
        }
        return categoryList;
    }
}
