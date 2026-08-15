package com.transaction.service;

import com.transaction.dao.UserRepository;
import com.transaction.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    @Autowired
    private final UserRepository userRepository;


    public User getOrCreateUser(String auth_provider_user_id, String auth_provider, String username) {
        return userRepository.findByProviderUserId(auth_provider_user_id,auth_provider)
                .orElseGet(() -> {
                    try {
                        User newUser = new User();
                        newUser.setAuth_provider_user_id(auth_provider_user_id);
                        newUser.setUsername(username);
                        User user = userRepository.save(newUser);
                        return user;
                    } catch (DataIntegrityViolationException ex) {
                        // another thread inserted same user
                        return userRepository.findByProviderUserId(auth_provider_user_id, auth_provider)
                                .orElseThrow(() -> ex);
                    }
                });
    }

    public User getUserByUserId(Long userId) {
        return userRepository.findById(userId);
    }

}
