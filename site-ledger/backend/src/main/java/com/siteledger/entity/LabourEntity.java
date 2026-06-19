package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "labour_entries")
@Getter
@Setter
@ToString(exclude = {"site", "user"})
@NoArgsConstructor
@AllArgsConstructor
public class LabourEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String labourName;

    @Column(length = 100)
    private String category;

    @Column(nullable = false)
    private LocalDate date;

    /** Check-in time (attendance), e.g. "09:00" */
    @Column(length = 10)
    private String checkIn;

    /** Check-out time (attendance), e.g. "17:00" */
    @Column(length = 10)
    private String checkOut;

    /** Hours worked (auto-calculated from check-in/check-out) */
    @Column(precision = 6, scale = 2)
    private BigDecimal hoursWorked;

    /** Number of workers/attendance count for this entry */
    @Column(precision = 6, scale = 0)
    private Integer attendanceCount = 1;

    /** Wage type: DAILY_WAGE, MONTHLY, CONTRACT, PIECE_RATE */
    @Column(length = 20)
    private String wageType;

    /** Rate per unit (per day/hour/piece) */
    @Column(precision = 12, scale = 2)
    private BigDecimal rate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 500)
    private String remarks;

    /** Entry lock: SITE_STAFF entries lock on save, only Office/Admin can edit */
    @Column(nullable = false)
    private boolean locked = false;

    /** Office verification */
    @Column(nullable = false)
    private boolean verified = false;

    private LocalDateTime verifiedAt;

    @Column(length = 100)
    private String verifiedBy;

    /** Who created this entry */
    @Column(length = 100)
    private String createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "assignedStaff", "address", "startDate", "endDate", "workOrderNumber", "contractValue", "department"})
    private SiteEntity site;

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
