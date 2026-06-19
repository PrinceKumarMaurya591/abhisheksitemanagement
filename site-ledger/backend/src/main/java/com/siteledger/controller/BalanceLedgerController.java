package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.BalanceLedgerEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.BalanceLedgerRepository;
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
@RequestMapping("/api/balance-ledger")
public class BalanceLedgerController {

    private final BalanceLedgerRepository balanceLedgerRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public BalanceLedgerController(BalanceLedgerRepository balanceLedgerRepository,
                                   UserRepository userRepository,
                                   AuditService auditService) {
        this.balanceLedgerRepository = balanceLedgerRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @GetMapping("/my-balance")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyBalance(
            @RequestParam(required = false) Long siteId,
            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        BigDecimal totalReceived;
        BigDecimal totalExpense;
        BigDecimal currentBalance;

        if (siteId != null) {
            totalReceived = balanceLedgerRepository.totalReceivedByStaffAndSite(user.getId(), siteId);
            totalExpense = balanceLedgerRepository.totalExpenseByStaffAndSite(user.getId(), siteId);
        } else {
            totalReceived = balanceLedgerRepository.totalReceivedByStaff(user.getId());
            totalExpense = balanceLedgerRepository.totalExpenseByStaff(user.getId());
        }
        currentBalance = totalReceived.subtract(totalExpense);

        Map<String, Object> balance = new HashMap<>();
        balance.put("totalReceived", totalReceived);
        balance.put("totalExpense", totalExpense);
        balance.put("currentBalance", currentBalance);
        balance.put("staffName", user.getFullName() != null ? user.getFullName() : user.getUsername());
        if (siteId != null) {
            balance.put("siteId", siteId);
        }

        return ResponseEntity.ok(ApiResponse.success(balance));
    }

    @GetMapping("/my-transactions")
    public ResponseEntity<ApiResponse<List<BalanceLedgerEntity>>> getMyTransactions(
            @RequestParam(required = false) Long siteId,
            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        List<BalanceLedgerEntity> transactions;
        if (siteId != null) {
            transactions = balanceLedgerRepository.findByStaffUserIdAndSiteIdOrderByCreatedAtDesc(user.getId(), siteId);
        } else {
            transactions = balanceLedgerRepository.findByStaffUserIdOrderByCreatedAtDesc(user.getId());
        }

        return ResponseEntity.ok(ApiResponse.success(transactions));
    }

    @PostMapping("/advance")
    public ResponseEntity<ApiResponse<BalanceLedgerEntity>> giveAdvance(
            @RequestBody BalanceLedgerEntity balanceEntry,
            Authentication auth) {
        String username = auth.getName();
        UserEntity admin = userRepository.findByUsername(username).orElse(null);
        if (admin == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER and OFFICE_ADMIN can give advances
        if (admin.getRole() != UserEntity.Role.OWNER && admin.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: Only Office/Admin can give advances"));
        }

        balanceEntry.setTransactionType("RECEIVED");
        balanceEntry.setUser(admin);

        // Calculate running balance
        BigDecimal totalReceived = balanceLedgerRepository.totalReceivedByStaffAndSite(
                balanceEntry.getStaffUser().getId(), balanceEntry.getSite().getId());
        BigDecimal totalExpense = balanceLedgerRepository.totalExpenseByStaffAndSite(
                balanceEntry.getStaffUser().getId(), balanceEntry.getSite().getId());
        BigDecimal runningBalance = totalReceived.add(balanceEntry.getAmount()).subtract(totalExpense);
        balanceEntry.setRunningBalance(runningBalance);

        BalanceLedgerEntity saved = balanceLedgerRepository.save(balanceEntry);

        auditService.logCreate(username, admin.getRole().name(), "BALANCE_ADVANCE", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Advance given successfully", saved));
    }

    /** Admin: Get balance for any staff member */
    @GetMapping("/staff/{staffUserId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStaffBalance(@PathVariable Long staffUserId,
                                                                            Authentication auth) {
        String username = auth.getName();
        UserEntity admin = userRepository.findByUsername(username).orElse(null);
        if (admin == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        if (admin.getRole() != UserEntity.Role.OWNER && admin.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied"));
        }

        BigDecimal totalReceived = balanceLedgerRepository.totalReceivedByStaff(staffUserId);
        BigDecimal totalExpense = balanceLedgerRepository.totalExpenseByStaff(staffUserId);
        BigDecimal currentBalance = totalReceived.subtract(totalExpense);

        UserEntity staff = userRepository.findById(staffUserId).orElse(null);

        Map<String, Object> balance = new HashMap<>();
        balance.put("totalReceived", totalReceived);
        balance.put("totalExpense", totalExpense);
        balance.put("currentBalance", currentBalance);
        balance.put("staffName", staff != null ? (staff.getFullName() != null ? staff.getFullName() : staff.getUsername()) : "Unknown");
        balance.put("staffId", staffUserId);

        return ResponseEntity.ok(ApiResponse.success(balance));
    }
}
