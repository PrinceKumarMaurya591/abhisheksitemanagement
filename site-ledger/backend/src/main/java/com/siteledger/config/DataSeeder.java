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
        if (userRepository.count() == 0) {
            // Create OWNER (full access to everything)
            UserEntity owner = new UserEntity();
            owner.setUsername("owner");
            owner.setPassword(passwordEncoder.encode("owner123"));
            owner.setEmail("owner@siteledger.com");
            owner.setFullName("Owner (Malik)");
            owner.setRole(UserEntity.Role.OWNER);
            owner.setActive(true);
            userRepository.save(owner);

            // Create OFFICE_ADMIN (configurable access)
            UserEntity officeAdmin = new UserEntity();
            officeAdmin.setUsername("admin");
            officeAdmin.setPassword(passwordEncoder.encode("admin123"));
            officeAdmin.setEmail("admin@siteledger.com");
            officeAdmin.setFullName("Office Admin");
            officeAdmin.setRole(UserEntity.Role.OFFICE_ADMIN);
            officeAdmin.setAccessType("FULL_ACCESS");
            officeAdmin.setActive(true);
            userRepository.save(officeAdmin);

            // Create SITE_INCHARGE (permission-based, assigned sites only)
            UserEntity siteIncharge = new UserEntity();
            siteIncharge.setUsername("siteincharge");
            siteIncharge.setPassword(passwordEncoder.encode("site123"));
            siteIncharge.setEmail("siteincharge@siteledger.com");
            siteIncharge.setFullName("Site Incharge");
            siteIncharge.setRole(UserEntity.Role.SITE_INCHARGE);
            siteIncharge.setActive(true);
            userRepository.save(siteIncharge);

            // Create MUNSHI (permission-based, assigned sites only)
            UserEntity munshi = new UserEntity();
            munshi.setUsername("munshi");
            munshi.setPassword(passwordEncoder.encode("munshi123"));
            munshi.setEmail("munshi@siteledger.com");
            munshi.setFullName("Munshi");
            munshi.setRole(UserEntity.Role.MUNSHI);
            munshi.setActive(true);
            userRepository.save(munshi);

            // Create SUBCONTRACTOR (own work only)
            UserEntity subcontractor = new UserEntity();
            subcontractor.setUsername("subcontractor");
            subcontractor.setPassword(passwordEncoder.encode("sub123"));
            subcontractor.setEmail("subcontractor@siteledger.com");
            subcontractor.setFullName("Subcontractor");
            subcontractor.setRole(UserEntity.Role.SUBCONTRACTOR);
            subcontractor.setActive(true);
            userRepository.save(subcontractor);

            // Create SUBCONTRACTOR_ADMIN (can manage subcontractors)
            UserEntity subAdmin = new UserEntity();
            subAdmin.setUsername("subadmin");
            subAdmin.setPassword(passwordEncoder.encode("subadmin123"));
            subAdmin.setEmail("subadmin@siteledger.com");
            subAdmin.setFullName("Subcontractor Admin");
            subAdmin.setRole(UserEntity.Role.SUBCONTRACTOR_ADMIN);
            subAdmin.setActive(true);
            userRepository.save(subAdmin);

            // Create default permissions for SITE_INCHARGE (Material: View, Add; Labour: View, Add; Document: View)
            createPermission(siteIncharge, "MATERIAL", "VIEW");
            createPermission(siteIncharge, "MATERIAL", "ADD");
            createPermission(siteIncharge, "LABOUR", "VIEW");
            createPermission(siteIncharge, "LABOUR", "ADD");
            createPermission(siteIncharge, "DOCUMENT", "VIEW");
            createPermission(siteIncharge, "DOCUMENT", "ADD");
            createPermission(siteIncharge, "BALANCE", "VIEW");

            // Create default permissions for MUNSHI (Material: View, Add; Labour: View, Add)
            createPermission(munshi, "MATERIAL", "VIEW");
            createPermission(munshi, "MATERIAL", "ADD");
            createPermission(munshi, "LABOUR", "VIEW");
            createPermission(munshi, "LABOUR", "ADD");

            // Create default permissions for SUBCONTRACTOR (own work only)
            createPermission(subcontractor, "MATERIAL", "VIEW");

            System.out.println("Default users created:");
            System.out.println("  owner/owner123 - Owner (full access)");
            System.out.println("  admin/admin123 - Office Admin");
            System.out.println("  siteincharge/site123 - Site Incharge");
            System.out.println("  munshi/munshi123 - Munshi");
            System.out.println("  subcontractor/sub123 - Subcontractor");
            System.out.println("  subadmin/subadmin123 - Subcontractor Admin");
        }
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
