package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transport_entries")
@Getter
@Setter
@ToString(exclude = {"site", "user"})
@NoArgsConstructor
@AllArgsConstructor
public class TransportEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String vehicleType;

    @Column(nullable = false)
    private Integer trips;

    @Column(precision = 15, scale = 3)
    private BigDecimal quantity;

    @Column(length = 20)
    private String unit;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal rate;

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
        if (totalAmount == null && trips != null && rate != null) {
            totalAmount = BigDecimal.valueOf(trips).multiply(rate);
        }
    }
}
