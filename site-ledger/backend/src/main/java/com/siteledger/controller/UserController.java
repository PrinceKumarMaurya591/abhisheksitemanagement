package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'SUBCONTRACTOR_ADMIN')")
    public ResponseEntity<ApiResponse<List<UserEntity>>> getAllUsers() {
        List<UserEntity> users = userRepository.findAll();
        users.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserEntity>> getUser(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setPassword(null);
            return ResponseEntity.ok(ApiResponse.success(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/suspend")
    @PreAuthorize("hasAnyRole('OWNER', 'SUBCONTRACTOR_ADMIN')")
    public ResponseEntity<ApiResponse<UserEntity>> toggleSuspend(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setSuspended(!user.isSuspended());
            UserEntity saved = userRepository.save(user);
            saved.setPassword(null);
            String msg = user.isSuspended() ? "User suspended" : "User activated";
            return ResponseEntity.ok(ApiResponse.success(msg, saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('OWNER', 'SUBCONTRACTOR_ADMIN')")
    public ResponseEntity<ApiResponse<UserEntity>> createUser(@RequestBody UserEntity user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Username already exists"));
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email already exists"));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActive(true);
        user.setSuspended(false);
        UserEntity saved = userRepository.save(user);
        saved.setPassword(null);
        return ResponseEntity.ok(ApiResponse.success("User created successfully", saved));
    }
}
