package com.transaction.service;

import com.transaction.model.Category;
import com.transaction.model.CategoryResponse;
import com.transaction.model.SubCategory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Stream;

@Service
public class CategoryService {

    private final DataSource dataSource;

    @Autowired
    public CategoryService(DataSource dataSource) {
        this.dataSource = dataSource;
    }


    public List<CategoryResponse> getAllCategories() {
        List<String> categories = new ArrayList<>();
        String sql = "SELECT c.id as category_id,c.name AS category_name,sc.name AS subcategory_name\n" +
                "FROM categories c\n" +
                "join subcategories sc\n" +
                "on c.id=sc.category_id";

        Map<String, CategoryResponse> categoryResponseMap = new LinkedHashMap<>();

        try (Connection conn = dataSource.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {


            while (rs.next()) {

                String categoryName = rs.getString("category_name");
                String subCategoryName = rs.getString("subcategory_name");

                CategoryResponse categoryResponse =
                        categoryResponseMap.computeIfAbsent(
                                categoryName,
                                k -> new CategoryResponse(k, new ArrayList<>())
                        );

                categoryResponse.getSubCategories().add(subCategoryName);
            }
        } catch (SQLException e) {
            e.printStackTrace();
            // Handle exceptions appropriately
        }
        return new ArrayList<>(categoryResponseMap.values());
    }
}
