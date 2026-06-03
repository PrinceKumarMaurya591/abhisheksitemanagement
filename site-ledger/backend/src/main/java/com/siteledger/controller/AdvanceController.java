package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.AdvanceEntity;
import com.siteledger.entity.AdvanceExpenseEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.AdvanceExpenseRepository;
import com.siteledger.repository.AdvanceRepository;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/advances")
public class AdvanceController {

    private final AdvanceRepository advanceRepository;
    private final AdvanceExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    public AdvanceController(AdvanceRepository advanceRepository,
                             AdvanceExpenseRepository expenseRepository,
                             UserRepository userRepository,
                             PermissionRepository permissionRepository,
                             AuditService auditService) {
        this.advanceRepository = advanceRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<AdvanceEntity>>> getSiteAdvances(@PathVariable Long siteId,
                                                                             Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER and OFFICE_ADMIN can view advances (financial data)
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canView = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "BALANCE", "VIEW");
            if (!canView) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: Financial data not available"));
            }
        }

        return ResponseEntity.ok(ApiResponse.success(advanceRepository.findBySiteIdOrderByDateDesc(siteId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdvanceEntity>> createAdvance(@RequestBody AdvanceEntity advance,
                                                                     Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER and OFFICE_ADMIN can create advances
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: Only Office/Admin can create advances"));
        }

        advance.setStatus(AdvanceEntity.AdvanceStatus.OPEN);
        advance.setUser(user);
        AdvanceEntity saved = advanceRepository.save(advance);

        auditService.logCreate(username, user.getRole().name(), "ADVANCE", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Advance created", saved));
    }

    @PostMapping("/{advanceId}/expense")
    public ResponseEntity<ApiResponse<AdvanceExpenseEntity>> addExpense(@PathVariable Long advanceId,
                                                                         @RequestBody AdvanceExpenseEntity expense,
                                                                         Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        return advanceRepository.findById(advanceId).map(advance -> {
            expense.setAdvance(advance);
            AdvanceExpenseEntity saved = expenseRepository.save(expense);

            // Update advance settled amount
            BigDecimal totalExpenses = expenseRepository.totalExpenseByAdvance(advanceId);
            advance.setSettledAmount(totalExpenses);
            advanceRepository.save(advance);

            auditService.logCreate(username, user.getRole().name(), "ADVANCE_EXPENSE", saved.getId(),
                    advance.getSite() != null ? advance.getSite().getId() : null);

            return ResponseEntity.ok(ApiResponse.success("Expense added", saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{advanceId}/expenses")
    public ResponseEntity<ApiResponse<List<AdvanceExpenseEntity>>> getExpenses(@PathVariable Long advanceId) {
        return ResponseEntity.ok(ApiResponse.success(expenseRepository.findByAdvanceIdOrderByExpenseDateDesc(advanceId)));
    }

    @PostMapping("/{advanceId}/settle")
    public ResponseEntity<ApiResponse<AdvanceEntity>> settleAdvance(@PathVariable Long advanceId,
                                                                     Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        return advanceRepository.findById(advanceId).map(advance -> {
            advance.setStatus(AdvanceEntity.AdvanceStatus.SETTLED);
            AdvanceEntity saved = advanceRepository.save(advance);

            auditService.logUpdate(username, user.getRole().name(), "ADVANCE", saved.getId(),
                    "status", "OPEN", "SETTLED",
                    saved.getSite() != null ? saved.getSite().getId() : null);

            return ResponseEntity.ok(ApiResponse.success("Advance settled", saved));
        }).orElse(ResponseEntity.notFound().build());
    }
}
