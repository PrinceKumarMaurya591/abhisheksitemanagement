package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.TransportEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.TransportRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/transport")
public class TransportController {

    private final TransportRepository transportRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    public TransportController(TransportRepository transportRepository,
                               UserRepository userRepository,
                               PermissionRepository permissionRepository,
                               AuditService auditService) {
        this.transportRepository = transportRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<TransportEntity>>> getSiteTransport(@PathVariable Long siteId,
                                                                                Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canView = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "TRANSPORT", "VIEW");
            if (!canView) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No TRANSPORT VIEW permission"));
            }
        }

        return ResponseEntity.ok(ApiResponse.success(transportRepository.findBySiteIdOrderByDateDesc(siteId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TransportEntity>> createTransport(@RequestBody TransportEntity transport,
                                                                        Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canAdd = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "TRANSPORT", "ADD");
            if (!canAdd) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No TRANSPORT ADD permission"));
            }
        }

        // Auto-calculate total
        if (transport.getTrips() != null && transport.getRate() != null) {
            transport.setTotalAmount(BigDecimal.valueOf(transport.getTrips()).multiply(transport.getRate()));
        }

        transport.setCreatedBy(username);
        transport.setUser(user);
        TransportEntity saved = transportRepository.save(transport);

        auditService.logCreate(username, user.getRole().name(), "TRANSPORT", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Transport entry created", saved));
    }
}
