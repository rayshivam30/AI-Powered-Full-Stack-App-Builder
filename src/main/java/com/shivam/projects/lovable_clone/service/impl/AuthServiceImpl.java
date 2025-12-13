package com.shivam.projects.lovable_clone.service.impl;

import com.shivam.projects.lovable_clone.dto.auth.AuthResponse;
import com.shivam.projects.lovable_clone.dto.auth.LoginRequest;
import com.shivam.projects.lovable_clone.dto.auth.SignupRequest;
import com.shivam.projects.lovable_clone.entity.User;
import com.shivam.projects.lovable_clone.error.BadRequestException;
import com.shivam.projects.lovable_clone.mapper.UserMapper;
import com.shivam.projects.lovable_clone.repository.UserRepository;
import com.shivam.projects.lovable_clone.service.AuthService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class AuthServiceImpl implements AuthService {

    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;

    @Override
    public AuthResponse signup(SignupRequest request) {
        userRepository.findByUsername(request.username()).ifPresent(user -> {
            throw new BadRequestException("User already exists with username: "+request.username());
        });

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.password()));
        user = userRepository.save(user);

        return new AuthResponse("dummy", userMapper.toUserProfileResponse(user));
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        return null;
    }
}
