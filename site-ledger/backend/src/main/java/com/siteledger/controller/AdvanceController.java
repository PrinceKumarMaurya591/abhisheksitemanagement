package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.AdvanceEntity;
import com.siteledger.entity.AdvanceExpenseEntity;
import com.siteledger.entity.LedgerEntryEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.AdvanceExpenseRepository;
import com.siteledger.repository.AdvanceRepository;
import com.siteledger.repository.LedgerEntryRepository;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/advances")
public class AdvanceController {

    private final AdvanceRepository advanceRepository;
    private final AdvanceExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    private final LedgerEntryRepository ledgerEntryRepository;

    public AdvanceController(AdvanceRepository advanceRepository,
                             AdvanceExpenseRepository expenseRepository,
                             UserRepository userRepository,
                             PermissionRepository permissionRepository,
                             LedgerEntryRepository ledgerEntryRepository,
                             AuditService auditService) {
        this.advanceRepository = advanceRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
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

        // Auto-create a ledger entry (DEBIT) to track advance in site expenditure
        LedgerEntryEntity ledgerEntry = new LedgerEntryEntity();
        ledgerEntry.setEntryDate(advance.getDate() != null ? advance.getDate() : LocalDate.now());
        String personInfo = advance.getPersonName() != null ? advance.getPersonName() : "Site";
        String paymentTypeLabel = advance.getPaymentType() != null ? advance.getPaymentType() : "PERSON";
        ledgerEntry.setParticulars("Advance paid to " + personInfo + " (" + paymentTypeLabel + ")"
                + (advance.getPurpose() != null ? " - " + advance.getPurpose() : ""));
        ledgerEntry.setCategory(LedgerEntryEntity.Category.OTHER);
        ledgerEntry.setAmount(advance.getAmount());
        ledgerEntry.setEntryType(LedgerEntryEntity.EntryType.DEBIT);
        ledgerEntry.setSite(advance.getSite());
        ledgerEntry.setUser(user);
        ledgerEntryRepository.save(ledgerEntry);

        auditService.logCreate(username, user.getRole().name(), "ADVANCE", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Advance created", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AdvanceEntity>> updateAdvance(@PathVariable Long id,
                                                                     @RequestBody AdvanceEntity advance,
                                                                     Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        return advanceRepository.findById(id).map(existing -> {
            advance.setId(id);
            advance.setCreatedAt(existing.getCreatedAt());
            advance.setUser(existing.getUser());
            if (advance.getStatus() == null) {
                advance.setStatus(existing.getStatus());
            }
            if (advance.getSettledAmount() == null) {
                advance.setSettledAmount(existing.getSettledAmount());
            }

            return ResponseEntity.ok(ApiResponse.success("Advance updated",
                    advanceRepository.save(advance)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAdvance(@PathVariable Long id, Authentication auth) {
        if (!advanceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        advanceRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Advance deleted", null));
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
