package com.transaction.dao;

import com.transaction.model.Upload;
import com.transaction.model.User;
import org.springframework.jdbc.core.RowMapper;

public class UserRowMapper implements RowMapper<User> {

    @Override
    public User mapRow(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        User user = new User();
        user.setUserId(rs.getLong("user_id"));
        user.setUsername(rs.getString("username"));
        user.setAuth_provider(rs.getString("auth_provider"));
        user.setAuth_provider_user_id(rs.getString("auth_provider_user_id"));
        return user;
    }
}
