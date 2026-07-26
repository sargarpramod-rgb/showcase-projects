package com.transaction.upload.db;

import com.transaction.model.Upload;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;

public class UploadRowMapper implements RowMapper<Upload> {

    @Override
    public Upload mapRow(ResultSet rs, int rowNum) throws SQLException {

        Upload upload = new Upload();

        upload.setUploadId(rs.getLong("upload_id"));
        upload.setUserId(rs.getLong("user_id"));
        upload.setFileName(rs.getString("file_name"));
        upload.setFileHash(rs.getString("file_hash"));
        upload.setStatus(rs.getString("status"));

        upload.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        upload.setUpdatedAt(rs.getTimestamp("updated_at").toInstant());

        return upload;
    }
}