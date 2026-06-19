package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Material Shifting — Tracks bulk material movement from dump yard to road site.
 * Also tracks transport medium and its associated expense.
 * 
 * Example: Tractor carrying GSB
 *   - 2 trips (trail)
 *   - Rate: ₹600 per trip
 *   - Per trip: 100 Cum GSB
 *   
 * Calculations:
 *   Total Quantity = 2 × 100 = 200 Cum
 *   Transport Cost = 2 × ₹600 = ₹1,200
 */
@Entity
@Table(name = "material_shifting")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class MaterialShiftingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String materialName;

    /** STOCK or BULK */
    @Column(length = 10)
    private String materialType = "BULK";

    /** Source: Dump yard site ID (nullable for bulk from vendor) */
    private Long fromSiteId;

    /** Destination: Road/construction site ID */
    @Column(nullable = false)
    private Long toSiteId;

    /** Transport mode: Tractor, Truck, Dumper, etc. */
    @Column(length = 50)
    private String transportMode;

    /** Number of trips */
    @Column(nullable = false)
    private Integer trips;

    /** Rate per trip (₹) */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal ratePerTrip;

    /** Quantity carried per trip */
    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal quantityPerTrip;

    /** Total quantity = trips × quantityPerTrip (auto-calculated) */
    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal totalQuantity;

    /** Total transport cost = trips × ratePerTrip (auto-calculated) */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalTransportCost;

    @Column(nullable = false)
    private LocalDate date;

    @Column(length = 500)
    private String remarks;

    @Column(length = 100)
    private String createdBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        // Auto-calculate totals
        if (trips != null && ratePerTrip != null) {
            this.totalTransportCost = BigDecimal.valueOf(trips).multiply(ratePerTrip);
        }
        if (trips != null && quantityPerTrip != null) {
            this.totalQuantity = BigDecimal.valueOf(trips).multiply(quantityPerTrip);
        }
    }
}
