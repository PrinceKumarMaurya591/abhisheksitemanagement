package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.BalanceLedgerEntity;
import com.siteledger.entity.ExpenseEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.BalanceLedgerRepository;
import com.siteledger.repository.ExpenseRepository;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final BalanceLedgerRepository balanceLedgerRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    public ExpenseController(ExpenseRepository expenseRepository,
                             BalanceLedgerRepository balanceLedgerRepository,
                             UserRepository userRepository,
                             PermissionRepository permissionRepository,
                             AuditService auditService) {
        this.expenseRepository = expenseRepository;
        this.balanceLedgerRepository = balanceLedgerRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<ExpenseEntity>>> getSiteExpenses(@PathVariable Long siteId,
                                                                            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canView = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "EXPENSE", "VIEW");
            if (!canView) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No EXPENSE VIEW permission"));
            }
        }

        return ResponseEntity.ok(ApiResponse.success(expenseRepository.findBySiteIdOrderByDateDesc(siteId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ExpenseEntity>> createExpense(@RequestBody ExpenseEntity expense,
                                                                    Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canAdd = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "EXPENSE", "ADD");
            if (!canAdd) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No EXPENSE ADD permission"));
            }
        }

        expense.setCreatedBy(username);
        expense.setUser(user);
        ExpenseEntity saved = expenseRepository.save(expense);

        // Also create BalanceLedger entry for staff users (SITE_INCHARGE, MUNSHI)
        if (user.getRole() == UserEntity.Role.SITE_INCHARGE || user.getRole() == UserEntity.Role.MUNSHI) {
            BalanceLedgerEntity balanceEntry = new BalanceLedgerEntity();
            balanceEntry.setTransactionType("EXPENSE");
            balanceEntry.setPaymentSource(expense.getPaymentSource());
            balanceEntry.setDate(expense.getDate());
            balanceEntry.setAmount(expense.getAmount());
            balanceEntry.setDescription(expense.getExpenseType() + " - " + (expense.getRemarks() != null ? expense.getRemarks() : ""));
            balanceEntry.setVendorName(expense.getVendorName());
            balanceEntry.setStaffUser(user);
            balanceEntry.setSite(expense.getSite());
            balanceEntry.setUser(user);

            // Calculate running balance
            BigDecimal totalReceived = balanceLedgerRepository.totalReceivedByStaffAndSite(user.getId(), expense.getSite().getId());
            BigDecimal totalExpenses = balanceLedgerRepository.totalExpenseByStaffAndSite(user.getId(), expense.getSite().getId());
            BigDecimal runningBalance = totalReceived.subtract(totalExpenses.add(expense.getAmount()));
            balanceEntry.setRunningBalance(runningBalance);

            balanceLedgerRepository.save(balanceEntry);
        }

        auditService.logCreate(username, user.getRole().name(), "EXPENSE", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Expense entry created", saved));
    }
}
