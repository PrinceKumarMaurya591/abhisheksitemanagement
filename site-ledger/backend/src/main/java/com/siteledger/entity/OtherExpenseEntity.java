package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "other_expenses")
@Getter
@Setter
@ToString(exclude = {"category", "site", "yojna", "staffUser", "createdBy", "user"})
@NoArgsConstructor
@AllArgsConstructor
public class OtherExpenseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "applicableLevels", "createdAt", "description", "isActive"})
    private ExpenseCategoryEntity category;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate date;

    @Column(length = 500)
    private String description;

    @Column(length = 500)
    private String receiptPhoto;

    /** Which level this expense belongs to: YOJNA, SITE, STAFF */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExpenseCategoryEntity.ExpenseLevel expenseLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "yojna_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "sites", "description", "department", "startDate", "endDate", "status", "createdAt", "updatedAt"})
    private YojnaEntity yojna;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "assignedStaff", "address", "startDate", "endDate", "workOrderNumber", "contractValue", "department", "workName", "yojna"})
    private SiteEntity site;

    /** For STAFF-level expenses: the staff member (Munshi/Mate) who this expense belongs to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "email", "phone", "active", "suspended", "accessType", "assignedSiteIds"})
    private UserEntity staffUser;

    /** Who recorded this transaction */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private UserEntity user;

    /** Source of payment: COMPANY_ADVANCE, PERSONAL_MONEY, VENDOR_CREDIT */
    @Column(length = 30)
    private String paymentSource;

    /** If VENDOR_CREDIT, track vendor name */
    @Column(length = 200)
    private String vendorName;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
