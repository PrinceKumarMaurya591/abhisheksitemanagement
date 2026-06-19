package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.MaterialShiftingEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.MaterialShiftingRepository;
import com.siteledger.repository.MaterialRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/material-shifting")
public class MaterialShiftingController {

    private final MaterialShiftingRepository shiftingRepository;
    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public MaterialShiftingController(MaterialShiftingRepository shiftingRepository,
                                       MaterialRepository materialRepository,
                                       UserRepository userRepository,
                                       AuditService auditService) {
        this.shiftingRepository = shiftingRepository;
        this.materialRepository = materialRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<MaterialShiftingEntity>>> getShiftingForSite(
            @PathVariable Long siteId) {
        return ResponseEntity.ok(ApiResponse.success(
                shiftingRepository.findByToSiteIdOrderByDateDesc(siteId)));
    }

    @GetMapping("/summary/{siteId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getShiftingSummary(
            @PathVariable Long siteId) {
        BigDecimal totalQuantity = shiftingRepository.totalQuantityShiftedToSite(siteId);
        BigDecimal totalTransportCost = shiftingRepository.totalTransportCostToSite(siteId);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalQuantity", totalQuantity);
        summary.put("totalTransportCost", totalTransportCost);
        summary.put("totalShifts", shiftingRepository.findByToSiteIdOrderByDateDesc(siteId).size());

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaterialShiftingEntity>> createShifting(
            @RequestBody MaterialShiftingEntity shifting,
            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Auto-calculate totals
        if (shifting.getTrips() != null && shifting.getRatePerTrip() != null) {
            shifting.setTotalTransportCost(
                    BigDecimal.valueOf(shifting.getTrips()).multiply(shifting.getRatePerTrip()));
        }
        if (shifting.getTrips() != null && shifting.getQuantityPerTrip() != null) {
            shifting.setTotalQuantity(
                    BigDecimal.valueOf(shifting.getTrips()).multiply(shifting.getQuantityPerTrip()));
        }

        shifting.setCreatedBy(username);
        MaterialShiftingEntity saved = shiftingRepository.save(shifting);

        auditService.logCreate(username, user.getRole().name(), "MATERIAL_SHIFTING", saved.getId(), shifting.getToSiteId());

        return ResponseEntity.ok(ApiResponse.success("Material shifting recorded", saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteShifting(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER and OFFICE_ADMIN can delete
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied"));
        }

        if (!shiftingRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        shiftingRepository.deleteById(id);
        auditService.logDelete(username, user.getRole().name(), "MATERIAL_SHIFTING", id, null);
        return ResponseEntity.ok(ApiResponse.success("Shifting record deleted", null));
    }
}
