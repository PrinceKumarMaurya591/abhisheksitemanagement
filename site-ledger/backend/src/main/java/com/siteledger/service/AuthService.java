package com.siteledger.service;

import com.siteledger.dto.JwtResponse;
import com.siteledger.dto.LoginRequest;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.UserRepository;
import com.siteledger.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

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
        log.info("Login attempt for user: {}", request.getUsername());

        UserEntity user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.warn("Login failed: user '{}' not found", request.getUsername());
                    return new RuntimeException("Invalid username or password");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Login failed: invalid password for user '{}'", request.getUsername());
            throw new RuntimeException("Invalid username or password");
        }

        if (!user.isActive() || user.isSuspended()) {
            log.warn("Login failed: account '{}' is suspended/inactive (active={}, suspended={})",
                    request.getUsername(), user.isActive(), user.isSuspended());
            throw new RuntimeException("Account is suspended or inactive");
        }

        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());
        log.info("Login successful for user: {} (role={})", request.getUsername(), user.getRole());

        return new JwtResponse(token, user.getUsername(), user.getRole().name(),
                user.getFullName(), user.getId());
    }

    public UserEntity registerUser(UserEntity user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            log.warn("Registration failed: username '{}' already exists", user.getUsername());
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            log.warn("Registration failed: email '{}' already exists", user.getEmail());
            throw new RuntimeException("Email already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        UserEntity saved = userRepository.save(user);
        log.info("User registered successfully: {} (role={})", saved.getUsername(), saved.getRole());
        return saved;
    }
}
