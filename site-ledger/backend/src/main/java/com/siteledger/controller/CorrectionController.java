package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.CorrectionRequestEntity;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.CorrectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/corrections")
public class CorrectionController {

    private final CorrectionService correctionService;
    private final UserRepository userRepository;

    public CorrectionController(CorrectionService correctionService,
                                 UserRepository userRepository) {
        this.correctionService = correctionService;
        this.userRepository = userRepository;
    }

    /**
     * Request a correction for an entry.
     * Body: { "entityType": "LABOUR", "entityId": 123, "siteId": 1, "correctionReason": "Wrong amount" }
     */
    @PostMapping("/request")
    public ResponseEntity<ApiResponse<CorrectionRequestEntity>> requestCorrection(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        String entityType = (String) body.get("entityType");
        Long entityId = Long.valueOf(body.get("entityId").toString());
        Long siteId = Long.valueOf(body.get("siteId").toString());
        String reason = (String) body.get("correctionReason");
        String username = auth.getName();

        CorrectionRequestEntity saved = correctionService.requestCorrection(
                entityType, entityId, siteId, reason, username);
        return ResponseEntity.ok(ApiResponse.success("Correction requested successfully", saved));
    }

    /**
     * Get pending corrections (optionally filtered by site).
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<CorrectionRequestEntity>>> getPendingCorrections(
            @RequestParam(required = false) Long siteId) {
        return ResponseEntity.ok(ApiResponse.success(
                correctionService.getPendingCorrections(siteId)));
    }

    /**
     * Approve a correction request.
     * Body: { "correctedValues": { "amount": 5000, "labourName": "Ram" } }
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<CorrectionRequestEntity>> approveCorrection(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        @SuppressWarnings("unchecked")
        Map<String, Object> correctedValues = (Map<String, Object>) body.get("correctedValues");
        String username = auth.getName();

        CorrectionRequestEntity saved = correctionService.approveCorrection(id, correctedValues, username);
        return ResponseEntity.ok(ApiResponse.success("Correction approved and applied", saved));
    }

    /**
     * Reject a correction request.
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<CorrectionRequestEntity>> rejectCorrection(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        String rejectionReason = (String) body.get("rejectionReason");
        String username = auth.getName();

        CorrectionRequestEntity saved = correctionService.rejectCorrection(id, rejectionReason, username);
        return ResponseEntity.ok(ApiResponse.success("Correction rejected", saved));
    }

    /**
     * Get correction history for a specific entity.
     */
    @GetMapping("/history/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<List<CorrectionRequestEntity>>> getCorrectionHistory(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        return ResponseEntity.ok(ApiResponse.success(
                correctionService.getCorrectionHistory(entityType, entityId)));
    }

    /**
     * Get all corrections (optionally filtered by site).
     */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<CorrectionRequestEntity>>> getAllCorrections(
            @RequestParam(required = false) Long siteId) {
        return ResponseEntity.ok(ApiResponse.success(
                correctionService.getAllCorrections(siteId)));
    }
}
