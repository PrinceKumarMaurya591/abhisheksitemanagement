package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.*;
import com.siteledger.repository.*;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/verification")
public class VerificationController {

    private final LabourRepository labourRepository;
    private final ExpenseRepository expenseRepository;
    private final AuditService auditService;
    private final SiteRepository siteRepository;

    public VerificationController(LabourRepository labourRepository,
                                   ExpenseRepository expenseRepository,
                                   AuditService auditService,
                                   SiteRepository siteRepository) {
        this.labourRepository = labourRepository;
        this.expenseRepository = expenseRepository;
        this.auditService = auditService;
        this.siteRepository = siteRepository;
    }

    /**
     * Get all unverified entries across all sites (for Office).
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingVerifications(
            @RequestParam(required = false) Long siteId) {
        List<Map<String, Object>> pending = new ArrayList<>();

        // Labour entries
        List<LabourEntity> labourEntries = (siteId != null)
                ? labourRepository.findBySiteIdOrderByDateDesc(siteId)
                : labourRepository.findAll();
        labourEntries.stream()
                .filter(e -> !e.isVerified())
                .forEach(e -> pending.add(Map.of(
                        "entityType", "LABOUR",
                        "entityId", e.getId(),
                        "summary", (e.getLabourName() != null ? e.getLabourName() : "Labour") + " - " + (e.getDate() != null ? e.getDate().toString() : ""),
                        "amount", e.getAmount() != null ? e.getAmount().toString() : "0",
                        "createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : "",
                        "createdBy", e.getCreatedBy() != null ? e.getCreatedBy() : "",
                        "siteId", e.getSite() != null ? e.getSite().getId() : null,
                        "siteName", e.getSite() != null ? e.getSite().getSiteName() : "Unknown"
                )));

        // Expense entries
        List<ExpenseEntity> expenseEntries = (siteId != null)
                ? expenseRepository.findBySiteIdOrderByDateDesc(siteId)
                : expenseRepository.findAll();
        expenseEntries.stream()
                .filter(e -> !e.isVerified())
                .forEach(e -> pending.add(Map.of(
                        "entityType", "EXPENSE",
                        "entityId", e.getId(),
                        "summary", (e.getExpenseType() != null ? e.getExpenseType() : "Expense") + " - ₹" + (e.getAmount() != null ? e.getAmount().toString() : "0"),
                        "amount", e.getAmount() != null ? e.getAmount().toString() : "0",
                        "createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : "",
                        "createdBy", e.getCreatedBy() != null ? e.getCreatedBy() : "",
                        "siteId", e.getSite() != null ? e.getSite().getId() : null,
                        "siteName", e.getSite() != null ? e.getSite().getSiteName() : "Unknown"
                )));

        // Sort by createdAt descending
        pending.sort((a, b) -> ((String) b.get("createdAt")).compareTo((String) a.get("createdAt")));

        return ResponseEntity.ok(ApiResponse.success(pending));
    }

    /**
     * Verify an entry.
     */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String, String>>> verifyEntry(
            @RequestParam String entityType,
            @RequestParam Long entityId,
            Authentication auth) {
        String username = auth.getName();

        if ("LABOUR".equals(entityType)) {
            labourRepository.findById(entityId).ifPresent(e -> {
                e.setVerified(true);
                e.setVerifiedAt(LocalDateTime.now());
                e.setVerifiedBy(username);
                labourRepository.save(e);
                auditService.logUpdate(username, getRole(auth), "LABOUR", entityId,
                        "verified", "false", "true",
                        e.getSite() != null ? e.getSite().getId() : null);
            });
        } else if ("EXPENSE".equals(entityType)) {
            expenseRepository.findById(entityId).ifPresent(e -> {
                e.setVerified(true);
                e.setVerifiedAt(LocalDateTime.now());
                e.setVerifiedBy(username);
                expenseRepository.save(e);
                auditService.logUpdate(username, getRole(auth), "EXPENSE", entityId,
                        "verified", "false", "true",
                        e.getSite() != null ? e.getSite().getId() : null);
            });
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unknown entity type: " + entityType));
        }

        return ResponseEntity.ok(ApiResponse.success("Entry verified successfully",
                Map.of("entityType", entityType, "entityId", String.valueOf(entityId))));
    }

    /**
     * Get audit logs for an entity (correction history).
     */
    @GetMapping("/audit/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<List<AuditLogEntity>>> getAuditLogs(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        return ResponseEntity.ok(ApiResponse.success(
                auditService.getAuditLogs(entityType, entityId)));
    }

    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .findFirst()
                .map(g -> g.getAuthority().replace("ROLE_", ""))
                .orElse("UNKNOWN");
    }
}
