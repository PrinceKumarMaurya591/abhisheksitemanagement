package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.dto.JwtResponse;
import com.siteledger.dto.LoginRequest;
import com.siteledger.entity.UserEntity;
import com.siteledger.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("POST /api/auth/login - username: {}", request.getUsername());
        try {
            JwtResponse response = authService.login(request);
            log.info("Login successful for user: {}", request.getUsername());
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));
        } catch (RuntimeException e) {
            log.warn("Login failed for user '{}': {}", request.getUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error during login for user '{}': {}", request.getUsername(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Internal server error"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserEntity>> register(@Valid @RequestBody UserEntity user) {
        log.info("POST /api/auth/register - username: {}, email: {}", user.getUsername(), user.getEmail());
        try {
            UserEntity created = authService.registerUser(user);
            created.setPassword(null);
            log.info("User registered successfully: {}", created.getUsername());
            return ResponseEntity.ok(ApiResponse.success("User registered successfully", created));
        } catch (RuntimeException e) {
            log.warn("Registration failed for '{}': {}", user.getUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error during registration: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Internal server error"));
        }
    }
}
