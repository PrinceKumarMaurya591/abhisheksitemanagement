package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "balance_ledger")
@Getter
@Setter
@ToString(exclude = {"site", "user"})
@NoArgsConstructor
@AllArgsConstructor
public class BalanceLedgerEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Type of transaction: RECEIVED (Company gave money), EXPENSE (money spent), SETTLEMENT (office paid) */
    @Column(nullable = false, length = 20)
    private String transactionType;

    /** Payment source for expenses: COMPANY_ADVANCE, PERSONAL_MONEY, VENDOR_CREDIT */
    @Column(length = 30)
    private String paymentSource;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(precision = 12, scale = 2)
    private BigDecimal runningBalance;

    @Column(length = 500)
    private String description;

    @Column(length = 200)
    private String vendorName;

    /** Which staff member this balance belongs to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "email", "phone", "active", "suspended", "accessType", "assignedSiteIds"})
    private UserEntity staffUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private SiteEntity site;

    /** Who recorded this transaction */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private UserEntity user;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
