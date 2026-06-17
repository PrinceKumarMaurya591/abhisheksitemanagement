package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.LedgerEntryEntity;
import com.siteledger.entity.PaymentEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.LedgerEntryRepository;
import com.siteledger.repository.PaymentRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AuditService auditService;

    public PaymentController(PaymentRepository paymentRepository,
                             UserRepository userRepository,
                             LedgerEntryRepository ledgerEntryRepository,
                             AuditService auditService) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.auditService = auditService;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<PaymentEntity>>> getSitePayments(@PathVariable Long siteId,
                                                                            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER and OFFICE_ADMIN can view payments (financial data)
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: Financial data not available"));
        }

        return ResponseEntity.ok(ApiResponse.success(paymentRepository.findBySiteIdOrderByBillDateDesc(siteId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentEntity>> createPayment(@RequestBody PaymentEntity payment,
                                                                     Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER and OFFICE_ADMIN can create payments
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: Only Office/Admin can manage payments"));
        }

        // Calculate pending amount
        BigDecimal receivedAmount = payment.getPaymentAmount() != null ? payment.getPaymentAmount() : BigDecimal.ZERO;
        BigDecimal pendingAmount = payment.getBillAmount().subtract(receivedAmount);
        payment.setPendingAmount(pendingAmount);
        payment.setUser(user);
        PaymentEntity saved = paymentRepository.save(payment);

        // Auto-create a ledger entry for the received payment amount so it reflects in dashboard
        if (receivedAmount.compareTo(BigDecimal.ZERO) > 0) {
            LedgerEntryEntity ledgerEntry = new LedgerEntryEntity();
            ledgerEntry.setEntryDate(payment.getPaymentDate() != null ? payment.getPaymentDate() : LocalDate.now());
            ledgerEntry.setParticulars("Payment received - Bill #" + payment.getBillNumber()
                    + (payment.getRemarks() != null ? " (" + payment.getRemarks() + ")" : ""));
            ledgerEntry.setCategory(LedgerEntryEntity.Category.TENDER);
            ledgerEntry.setAmount(receivedAmount);
            ledgerEntry.setEntryType(LedgerEntryEntity.EntryType.CREDIT);
            ledgerEntry.setSite(payment.getSite());
            ledgerEntry.setUser(user);
            ledgerEntryRepository.save(ledgerEntry);
        }

        auditService.logCreate(username, user.getRole().name(), "PAYMENT", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Payment recorded", saved));
    }
}
