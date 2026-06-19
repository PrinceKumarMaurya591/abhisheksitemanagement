package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Labour Registration — One-time registration for each labourer.
 * Stores photo, name, father name, mobile, category, rate per day, joining date, and active/inactive status.
 */
@Entity
@Table(name = "labour_registrations")
@Getter
@Setter
@ToString(exclude = {"site"})
@NoArgsConstructor
@AllArgsConstructor
public class LabourRegistrationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 500)
    private String photoPath;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String fatherName;

    @Column(length = 15)
    private String mobile;

    /** Labour, Mistri, Helper, Welder, Electrician, Plumber, Driver, Machine Operator, Carpenter, Painter, Other */
    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal ratePerDay;

    @Column(nullable = false)
    private LocalDate joiningDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private LabourStatus status = LabourStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private SiteEntity site;

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

    public enum LabourStatus {
        ACTIVE, INACTIVE
    }
}
