package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "subcontractor_work")
@Getter
@Setter
@ToString(exclude = {"site", "user"})
@NoArgsConstructor
@AllArgsConstructor
public class SubcontractorWorkEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Reference to the subcontractor user who created this entry */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subcontractor_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "email", "phone", "active", "suspended", "accessType", "assignedSiteIds"})
    private UserEntity subcontractor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "assignedStaff", "address", "startDate", "endDate", "workOrderNumber", "contractValue", "department"})
    private SiteEntity site;

    // ===== Work Order Details =====
    @Column(length = 100)
    private String workOrderNumber;

    @Column(length = 500)
    private String workDescription;

    /** Contracted/Agreed quantity for this work */
    @Column(precision = 15, scale = 3)
    private BigDecimal contractedQuantity;

    /** Agreed rate per unit */
    @Column(precision = 12, scale = 2)
    private BigDecimal rate;

    /** Unit of measurement (e.g., SQFT, CUM, NOS, KG) */
    @Column(length = 20)
    private String unit;

    // ===== Daily Work Done =====
    @Column(nullable = false)
    private LocalDate workDate;

    /** Quantity executed on this date */
    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal quantityExecuted;

    // ===== Material Supplied By Contractor =====
    @Column(length = 200)
    private String materialName;

    /** Quantity of material supplied by contractor */
    @Column(precision = 15, scale = 3)
    private BigDecimal materialQuantity;

    @Column(length = 20)
    private String materialUnit;

    // ===== Payment Status =====
    /** Amount paid to subcontractor for this work */
    @Column(precision = 12, scale = 2)
    private BigDecimal paymentAmount;

    @Column(length = 50)
    private String paymentStatus; // PENDING, PARTIAL, PAID

    // ===== Supporting Photos =====
    /** File path to supporting photo */
    @Column(length = 500)
    private String photoPath;

    /** Original filename of the photo */
    @Column(length = 200)
    private String photoFileName;

    // ===== Remarks =====
    @Column(length = 1000)
    private String remarks;

    /** Who created this entry */
    @Column(length = 100)
    private String createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private UserEntity user;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (paymentStatus == null) {
            paymentStatus = "PENDING";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
