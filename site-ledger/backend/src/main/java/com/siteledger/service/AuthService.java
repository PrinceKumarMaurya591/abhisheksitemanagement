package com.siteledger.service;

import com.siteledger.dto.JwtResponse;
import com.siteledger.dto.LoginRequest;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.UserRepository;
import com.siteledger.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public JwtResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        if (!user.isActive() || user.isSuspended()) {
            throw new RuntimeException("Account is suspended or inactive");
        }

        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());

        return new JwtResponse(token, user.getUsername(), user.getRole().name(),
                user.getFullName(), user.getId());
    }

    public UserEntity registerUser(UserEntity user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }
}
