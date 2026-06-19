package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.LabourAttendanceEntity;
import com.siteledger.entity.LabourPaymentEntity;
import com.siteledger.entity.LabourRegistrationEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import com.siteledger.service.LabourManagementService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/labour-management")
public class LabourManagementController {

    private final LabourManagementService labourManagementService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public LabourManagementController(LabourManagementService labourManagementService,
                                       UserRepository userRepository,
                                       AuditService auditService) {
        this.labourManagementService = labourManagementService;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    // ==================== REGISTRATION ====================

    @GetMapping("/registrations/{siteId}")
    public ResponseEntity<ApiResponse<List<LabourRegistrationEntity>>> getRegisteredLabourers(
            @PathVariable Long siteId,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(ApiResponse.success(
                labourManagementService.getRegisteredLabourers(siteId, includeInactive)));
    }

    @PostMapping("/registrations")
    public ResponseEntity<ApiResponse<LabourRegistrationEntity>> registerLabourer(
            @RequestBody LabourRegistrationEntity registration,
            Authentication auth) {
        String username = auth.getName();
        LabourRegistrationEntity saved = labourManagementService.registerLabourer(registration, username);
        auditService.logCreate(username, getRole(auth), "LABOUR_REGISTRATION", saved.getId(),
                registration.getSite() != null ? registration.getSite().getId() : null);
        return ResponseEntity.ok(ApiResponse.success("Labourer registered successfully", saved));
    }

    @PutMapping("/registrations/{id}")
    public ResponseEntity<ApiResponse<LabourRegistrationEntity>> updateLabourer(
            @PathVariable Long id,
            @RequestBody LabourRegistrationEntity update,
            Authentication auth) {
        String username = auth.getName();
        LabourRegistrationEntity saved = labourManagementService.updateLabourer(id, update);
        auditService.logUpdate(username, getRole(auth), "LABOUR_REGISTRATION", id,
                "details", "updated", "updated",
                saved.getSite() != null ? saved.getSite().getId() : null);
        return ResponseEntity.ok(ApiResponse.success("Labourer updated successfully", saved));
    }

    // ==================== ATTENDANCE ====================

    @GetMapping("/attendance/{siteId}")
    public ResponseEntity<ApiResponse<List<LabourAttendanceEntity>>> getAttendance(
            @PathVariable Long siteId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(
                labourManagementService.getAttendanceForDate(siteId, date)));
    }

    @GetMapping("/attendance/{siteId}/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttendanceSummary(
            @PathVariable Long siteId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(
                labourManagementService.getAttendanceSummary(siteId, date)));
    }

    @PostMapping("/attendance/bulk")
    public ResponseEntity<ApiResponse<String>> markBulkAttendance(
            @RequestParam Long siteId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody List<LabourManagementService.AttendanceRecord> records,
            Authentication auth) {
        String username = auth.getName();
        labourManagementService.markBulkAttendance(siteId, date, records, username);
        auditService.logCreate(username, getRole(auth), "LABOUR_ATTENDANCE_BULK", siteId, siteId);
        return ResponseEntity.ok(ApiResponse.success("Attendance marked for " + records.size() + " labourer(s)", null));
    }

    // ==================== WAGE CALCULATION ====================

    @GetMapping("/wages/{siteId}")
    public ResponseEntity<ApiResponse<List<LabourManagementService.WageRecord>>> calculateWages(
            @PathVariable Long siteId,
            @RequestParam(required = false) String month) {
        YearMonth yearMonth = (month != null && !month.isEmpty())
                ? YearMonth.parse(month)
                : YearMonth.now();
        return ResponseEntity.ok(ApiResponse.success(
                labourManagementService.calculateMonthlyWages(siteId, yearMonth)));
    }

    // ==================== PAYMENT ====================

    @GetMapping("/payments/{siteId}")
    public ResponseEntity<ApiResponse<List<LabourPaymentEntity>>> getPayments(@PathVariable Long siteId) {
        return ResponseEntity.ok(ApiResponse.success(
                labourManagementService.getPaymentsBySite(siteId)));
    }

    @PostMapping("/payments")
    public ResponseEntity<ApiResponse<LabourPaymentEntity>> processPayment(
            @RequestBody LabourPaymentEntity payment,
            Authentication auth) {
        String username = auth.getName();
        LabourPaymentEntity saved = labourManagementService.processPayment(payment, username);
        auditService.logCreate(username, getRole(auth), "LABOUR_PAYMENT", saved.getId(), payment.getSiteId());
        return ResponseEntity.ok(ApiResponse.success("Payment processed successfully", saved));
    }

    // ==================== DASHBOARD ====================

    @GetMapping("/dashboard/{siteId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLabourDashboard(@PathVariable Long siteId) {
        return ResponseEntity.ok(ApiResponse.success(
                labourManagementService.getLabourDashboard(siteId)));
    }

    // ==================== HELPERS ====================

    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .findFirst()
                .map(g -> g.getAuthority().replace("ROLE_", ""))
                .orElse("UNKNOWN");
    }
}
