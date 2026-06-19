package com.siteledger.config;

import com.siteledger.entity.PermissionEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionRepository permissionRepository;

    public DataSeeder(UserRepository userRepository,
                      PasswordEncoder passwordEncoder,
                      PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissionRepository = permissionRepository;
    }

    @Override
    public void run(String... args) {
        seedUser("owner", "owner123", "owner@siteledger.com", "Owner (Malik)", UserEntity.Role.OWNER, null);
        seedUser("admin", "admin123", "admin@siteledger.com", "Office Admin", UserEntity.Role.OFFICE_ADMIN, "FULL_ACCESS");
        seedUser("siteincharge", "site123", "siteincharge@siteledger.com", "Site Incharge", UserEntity.Role.SITE_INCHARGE, null);
        seedUser("munshi", "munshi123", "munshi@siteledger.com", "Munshi", UserEntity.Role.MUNSHI, null);
        seedUser("mate", "mate123", "mate@siteledger.com", "Mate", UserEntity.Role.MATE, null);

        // Ensure existing users have the correct permissions (e.g. after schema update)
        ensurePermissionsForExistingUsers();

        System.out.println("Default user seeding complete.");
    }

    /**
     * Ensures that existing users have the correct permissions based on their role.
     * This handles the case where users were created before a permission update.
     */
    private void ensurePermissionsForExistingUsers() {
        for (UserEntity.Role role : new UserEntity.Role[]{
                UserEntity.Role.SITE_INCHARGE,
                UserEntity.Role.MUNSHI,
                UserEntity.Role.MATE}) {
            userRepository.findByRole(role).forEach(user -> {
                if (role == UserEntity.Role.SITE_INCHARGE) {
                    ensurePermission(user, "MATERIAL", "VIEW");
                    ensurePermission(user, "MATERIAL", "ADD");
                    ensurePermission(user, "LABOUR", "VIEW");
                    ensurePermission(user, "LABOUR", "ADD");
                    ensurePermission(user, "EXPENSE", "VIEW");
                    ensurePermission(user, "EXPENSE", "ADD");
                    ensurePermission(user, "DOCUMENT", "VIEW");
                    ensurePermission(user, "DOCUMENT", "ADD");
                    ensurePermission(user, "BALANCE", "VIEW");
                } else if (role == UserEntity.Role.MUNSHI || role == UserEntity.Role.MATE) {
                    ensurePermission(user, "MATERIAL", "VIEW");
                    ensurePermission(user, "MATERIAL", "ADD");
                    ensurePermission(user, "LABOUR", "VIEW");
                    ensurePermission(user, "EXPENSE", "VIEW");
                    ensurePermission(user, "EXPENSE", "ADD");
                }
            });
        }
    }

    private void ensurePermission(UserEntity user, String module, String permission) {
        if (!permissionRepository.existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), module, permission)) {
            createPermission(user, module, permission);
            System.out.println("    Added missing permission: " + user.getUsername() + " -> " + module + ":" + permission);
        }
    }

    private void seedUser(String username, String password, String email,
                          String fullName, UserEntity.Role role, String accessType) {
        if (userRepository.existsByUsername(username)) {
            System.out.println("  User '" + username + "' already exists, skipping.");
            return;
        }
        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setFullName(fullName);
        user.setRole(role);
        user.setActive(true);
        if (accessType != null) {
            user.setAccessType(accessType);
        }
        userRepository.save(user);

        // Seed default permissions based on role
        if (role == UserEntity.Role.SITE_INCHARGE) {
            createPermission(user, "MATERIAL", "VIEW");
            createPermission(user, "MATERIAL", "ADD");
            createPermission(user, "LABOUR", "VIEW");
            createPermission(user, "LABOUR", "ADD");
            createPermission(user, "EXPENSE", "VIEW");
            createPermission(user, "EXPENSE", "ADD");
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

        System.out.println("  Created user: " + username + "/" + password + " - " + fullName);
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
