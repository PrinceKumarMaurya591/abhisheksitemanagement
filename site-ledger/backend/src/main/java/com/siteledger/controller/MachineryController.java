package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.MachineryEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.MachineryRepository;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/machinery")
public class MachineryController {

    private final MachineryRepository machineryRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    public MachineryController(MachineryRepository machineryRepository,
                               UserRepository userRepository,
                               PermissionRepository permissionRepository,
                               AuditService auditService) {
        this.machineryRepository = machineryRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<MachineryEntity>>> getSiteMachinery(@PathVariable Long siteId,
                                                                               Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check permission for non-OWNER/OFFICE_ADMIN
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canView = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "MACHINERY", "VIEW");
            if (!canView) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No MACHINERY VIEW permission"));
            }
        }

        return ResponseEntity.ok(ApiResponse.success(machineryRepository.findBySiteIdOrderByDateDesc(siteId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MachineryEntity>> createMachinery(@RequestBody MachineryEntity machinery,
                                                                        Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check ADD permission for non-OWNER/OFFICE_ADMIN
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canAdd = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "MACHINERY", "ADD");
            if (!canAdd) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No MACHINERY ADD permission"));
            }
        }

        // Auto-calculate total amount
        if (machinery.getHours() != null && machinery.getRate() != null) {
            machinery.setTotalAmount(machinery.getHours().multiply(machinery.getRate()));
        }

        machinery.setCreatedBy(username);
        machinery.setUser(user);
        MachineryEntity saved = machineryRepository.save(machinery);

        auditService.logCreate(username, user.getRole().name(), "MACHINERY", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Machinery entry created", saved));
    }
}
