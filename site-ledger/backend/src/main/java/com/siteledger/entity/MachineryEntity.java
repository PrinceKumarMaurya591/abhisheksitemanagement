package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "machinery_entries")
@Getter
@Setter
@ToString(exclude = {"site", "user"})
@NoArgsConstructor
@AllArgsConstructor
public class MachineryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String machineName;

    @Column(nullable = false)
    private BigDecimal hours;

    /** Per-day rate for machinery */
    @Column(precision = 12, scale = 2)
    private BigDecimal dailyRate;

    /** Number of days the machinery was used */
    @Column(precision = 6, scale = 0)
    private Integer daysCount;

    /** Rate per hour or per day (based on rental type) */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal rate;

    /** Rental type: HOURLY or DAILY */
    @Column(length = 10)
    private String rentalType = "HOURLY";

    @Column(precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 200)
    private String vendorName;

    @Column(length = 100)
    private String vehicleNumber;

    @Column(nullable = false)
    private LocalDate date;

    @Column(length = 500)
    private String remarks;

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
        if (totalAmount == null) {
            if ("DAILY".equals(rentalType) && dailyRate != null && daysCount != null) {
                totalAmount = dailyRate.multiply(BigDecimal.valueOf(daysCount));
            } else if (hours != null && rate != null) {
                totalAmount = hours.multiply(rate);
            }
        }
    }
}
