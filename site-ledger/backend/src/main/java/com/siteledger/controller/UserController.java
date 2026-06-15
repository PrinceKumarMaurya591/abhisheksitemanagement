package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.PermissionEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.PermissionRepository;
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
    private final PermissionRepository permissionRepository;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissionRepository = permissionRepository;
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

        // Auto-create default permissions based on role
        seedDefaultPermissions(saved);

        saved.setPassword(null);
        return ResponseEntity.ok(ApiResponse.success("User created successfully", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserEntity>> updateUser(@PathVariable Long id,
                                                               @RequestBody UserEntity userUpdate) {
        return userRepository.findById(id).map(existing -> {
            // Update fields if provided
            if (userUpdate.getFullName() != null) {
                existing.setFullName(userUpdate.getFullName());
            }
            if (userUpdate.getEmail() != null) {
                existing.setEmail(userUpdate.getEmail());
            }
            if (userUpdate.getPhone() != null) {
                existing.setPhone(userUpdate.getPhone());
            }
            if (userUpdate.getRole() != null) {
                existing.setRole(userUpdate.getRole());
            }
            if (userUpdate.getAssignedSiteIds() != null) {
                existing.setAssignedSiteIds(userUpdate.getAssignedSiteIds());
            }
            if (userUpdate.getPassword() != null && !userUpdate.getPassword().isEmpty()) {
                existing.setPassword(passwordEncoder.encode(userUpdate.getPassword()));
            }

            UserEntity saved = userRepository.save(existing);
            saved.setPassword(null);
            return ResponseEntity.ok(ApiResponse.success("User updated successfully", saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    private void seedDefaultPermissions(UserEntity user) {
        UserEntity.Role role = user.getRole();

        if (role == UserEntity.Role.SITE_INCHARGE) {
            createPermission(user, "MATERIAL", "VIEW");
            createPermission(user, "MATERIAL", "ADD");
            createPermission(user, "LABOUR", "VIEW");
            createPermission(user, "LABOUR", "ADD");
            createPermission(user, "DOCUMENT", "VIEW");
            createPermission(user, "DOCUMENT", "ADD");
            createPermission(user, "BALANCE", "VIEW");
        } else if (role == UserEntity.Role.MUNSHI) {
            createPermission(user, "MATERIAL", "VIEW");
            createPermission(user, "MATERIAL", "ADD");
            createPermission(user, "LABOUR", "VIEW");
            createPermission(user, "EXPENSE", "VIEW");
            createPermission(user, "EXPENSE", "ADD");
        } else if (role == UserEntity.Role.MATE) {
            createPermission(user, "MATERIAL", "VIEW");
            createPermission(user, "MATERIAL", "ADD");
            createPermission(user, "LABOUR", "VIEW");
            createPermission(user, "EXPENSE", "VIEW");
            createPermission(user, "EXPENSE", "ADD");
        }
        // OWNER and OFFICE_ADMIN have full access by role, no individual permissions needed
    }

    private void createPermission(UserEntity user, String module, String permission) {
        PermissionEntity p = new PermissionEntity();
        p.setUser(user);
        p.setModule(module);
        p.setPermission(permission);
        p.setEnabled(true);
        permissionRepository.save(p);
    }
}
