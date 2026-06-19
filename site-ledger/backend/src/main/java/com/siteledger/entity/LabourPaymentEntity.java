package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Labour Payment — Records payment to a registered labourer.
 * Supports advance deduction, auto-calculates net payable, and integrates with site ledger.
 */
@Entity
@Table(name = "labour_payments")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class LabourPaymentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long labourRegistrationId;

    @Column(nullable = false)
    private Long siteId;

    /** Month/period for which payment is made, e.g. "2026-06" */
    @Column(length = 7)
    private String payPeriod;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal grossWage;

    @Column(precision = 12, scale = 2)
    private BigDecimal advanceDeduction = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal netPayable;

    @Column(precision = 12, scale = 2)
    private BigDecimal paidAmount;

    /** CASH, BANK_TRANSFER */
    @Column(length = 20)
    private String paymentMode;

    private LocalDate paymentDate;

    /** Whether this payment has been synced to site ledger */
    @Column(nullable = false)
    private boolean syncedToLedger = false;

    @Column(length = 100)
    private String createdBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
