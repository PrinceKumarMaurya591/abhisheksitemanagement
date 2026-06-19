package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "materials")
@Getter
@Setter
@ToString(exclude = {"site"})
@NoArgsConstructor
@AllArgsConstructor
public class MaterialEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String materialName;

    @Column(length = 20)
    private String unit;

    /** STOCK (Cement, Steel, Pipe) or BULK (GSB, WMM, Sand, Morrum, Earth) */
    @Column(length = 10)
    private String materialType = "STOCK";

    @Column(precision = 15, scale = 3)
    private BigDecimal purchasedQty = BigDecimal.ZERO;

    @Column(precision = 15, scale = 3)
    private BigDecimal shiftedQty = BigDecimal.ZERO;

    @Column(precision = 15, scale = 3)
    private BigDecimal consumedQty = BigDecimal.ZERO;

    @Column(precision = 15, scale = 3)
    private BigDecimal balanceQty = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    private BigDecimal rate;

    @Column(length = 500)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private SiteEntity site;

    /** Who created this entry */
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
