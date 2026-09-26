package com.transaction.model;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    private Long userId;
    private String username;
    private String auth_provider_user_id;
    private String auth_provider;
}
