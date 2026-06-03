package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.PaymentEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.PaymentRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public PaymentController(PaymentRepository paymentRepository,
                             UserRepository userRepository,
                             AuditService auditService) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
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

        payment.setUser(user);
        PaymentEntity saved = paymentRepository.save(payment);

        auditService.logCreate(username, user.getRole().name(), "PAYMENT", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Payment recorded", saved));
    }
}
