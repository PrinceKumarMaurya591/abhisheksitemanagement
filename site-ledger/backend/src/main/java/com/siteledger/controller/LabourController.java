package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.LabourEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.LabourRepository;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/labour")
public class LabourController {

    private final LabourRepository labourRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    public LabourController(LabourRepository labourRepository,
                            UserRepository userRepository,
                            PermissionRepository permissionRepository,
                            AuditService auditService) {
        this.labourRepository = labourRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<LabourEntity>>> getSiteLabour(@PathVariable Long siteId,
                                                                          Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check VIEW permission for non-OWNER/OFFICE_ADMIN
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canView = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "LABOUR", "VIEW");
            if (!canView) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No LABOUR VIEW permission"));
            }
        }

        List<LabourEntity> labourEntries = labourRepository.findBySiteIdOrderByDateDesc(siteId);

        // MUNSHI/MATE can only see entries they created themselves, within 24-hour window
        if (user.getRole() == UserEntity.Role.MUNSHI || user.getRole() == UserEntity.Role.MATE) {
            labourEntries = labourEntries.stream()
                    .filter(l -> username.equals(l.getCreatedBy()))
                    .filter(l -> l.getCreatedAt() != null
                            && java.time.Duration.between(l.getCreatedAt(), java.time.LocalDateTime.now()).toHours() < 24)
                    .toList();
        }

        return ResponseEntity.ok(ApiResponse.success(labourEntries));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LabourEntity>> createLabour(@RequestBody LabourEntity labour,
                                                                   Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check ADD permission for non-OWNER/OFFICE_ADMIN
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canAdd = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "LABOUR", "ADD");
            if (!canAdd) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No LABOUR ADD permission"));
            }
        }

        // Entry lock: SITE_STAFF entries lock on save (cannot be edited/deleted after saving)
        if (user.getRole() == UserEntity.Role.SITE_INCHARGE || user.getRole() == UserEntity.Role.MUNSHI) {
            labour.setLocked(true);
        }

        labour.setCreatedBy(username);
        labour.setUser(user);
        LabourEntity saved = labourRepository.save(labour);

        auditService.logCreate(username, user.getRole().name(), "LABOUR", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Labour entry created", saved));
    }
}
