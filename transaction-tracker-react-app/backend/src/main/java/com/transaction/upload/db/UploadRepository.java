package com.transaction.upload.db;

import com.transaction.model.Upload;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UploadRepository {

    private final JdbcTemplate jdbcTemplate;

    public Optional<Upload> findByUserIdAndFileHash(Long userId, String fileHash) {

        String sql = """
            SELECT * FROM uploads
            WHERE user_id = ? AND file_hash = ?
        """;

        List<Upload> results = jdbcTemplate.query(
                sql,
                new UploadRowMapper(),
                userId,
                fileHash
        );

        return results.stream().findFirst();
    }

    public Upload save(Upload upload) {

        String sql = """
            INSERT INTO uploads (user_id, file_name, file_hash, status)
            VALUES (?, ?, ?, ?)
        """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    sql,
                    Statement.RETURN_GENERATED_KEYS
            );

            ps.setLong(1, upload.getUserId());
            ps.setString(2, upload.getFileName());
            ps.setString(3, upload.getFileHash());
            ps.setString(4, upload.getStatus());

            return ps;
        }, keyHolder);

        upload.setUploadId(keyHolder.getKey().longValue());
        return upload;
    }

    public Optional<Upload> findById(Long uploadId) {

        String sql = "SELECT * FROM uploads WHERE upload_id = ?";

        List<Upload> results = jdbcTemplate.query(
                sql,
                new UploadRowMapper(),
                uploadId
        );

        return results.stream().findFirst();
    }

    public void updateStatus(Long uploadId, String status) {

        String sql = """
            UPDATE uploads
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE upload_id = ?
        """;

        jdbcTemplate.update(sql, status, uploadId);
    }
}