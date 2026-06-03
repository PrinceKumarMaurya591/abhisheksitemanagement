package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.dto.JwtResponse;
import com.siteledger.dto.LoginRequest;
import com.siteledger.entity.UserEntity;
import com.siteledger.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest request) {
        try {
            JwtResponse response = authService.login(request);
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserEntity>> register(@Valid @RequestBody UserEntity user) {
        try {
            UserEntity created = authService.registerUser(user);
            created.setPassword(null);
            return ResponseEntity.ok(ApiResponse.success("User registered successfully", created));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
