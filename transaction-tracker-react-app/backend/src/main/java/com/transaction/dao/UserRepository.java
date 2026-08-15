package com.transaction.dao;

import com.transaction.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
@Log4j2
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    public Optional<User> findByProviderUserId(String auth_provider_user_id,String auth_provider) {
        String sql = "SELECT * FROM users u join user_auth_provider ua  on u.user_id=ua.user_id " +
                "WHERE ua.auth_provider_user_id = ? AND ua.auth_provider = ?";
        try {
            User user = jdbcTemplate.queryForObject(sql, new Object[]{auth_provider_user_id,auth_provider},
                    new UserRowMapper());

            return Optional.ofNullable(user);
        } catch (Exception e) {
            log.error("exception while finding user by provider user id", e);
            return Optional.empty();
        }
    }


    public User save(User user)  {

        try (Connection conn = DataSourceUtils.getConnection(jdbcTemplate.getDataSource())) {

            // 1️⃣ Insert into users
            PreparedStatement userStmt = conn.prepareStatement(
                    "INSERT INTO users (username) VALUES (?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            userStmt.setString(1, user.getUsername());
            userStmt.executeUpdate();

            ResultSet rs = userStmt.getGeneratedKeys();

            Long userId = null;
            if (rs.next()) {   // ✅ move cursor
                userId = rs.getLong(1);
            } else {
                //throw new SQLException("No generated key returned");
            }

            // 2️⃣ Insert into user_auth_provider
            PreparedStatement authStmt = conn.prepareStatement(
                    "INSERT INTO USER_AUTH_PROVIDER (user_id, auth_provider, auth_provider_user_id) VALUES (?, ?, ?)"
            );
            authStmt.setLong(1, userId);
            authStmt.setString(2, "google");
            authStmt.setString(3, user.getAuth_provider_user_id());
            authStmt.executeUpdate();

            user.setUserId(userId);
            return user;
        } catch (Exception e) {
            //TODO: Throw an exception and let UI show an error to the Users.
            log.error("exception while creating user", e);
        }
        return null;
    }

    public User findById(Long userId) {
        String sql = "SELECT * FROM users WHERE user_id = ?";
        return jdbcTemplate.queryForObject(sql, new Object[]{userId}, new UserRowMapper());
    }
}
