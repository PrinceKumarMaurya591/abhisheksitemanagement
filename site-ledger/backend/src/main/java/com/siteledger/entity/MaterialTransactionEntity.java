package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "material_transactions")
@Getter
@Setter
@ToString(exclude = {"material", "fromSite", "toSite", "site", "user"})
@NoArgsConstructor
@AllArgsConstructor
public class MaterialTransactionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType transactionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MaterialEntity material;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal quantity;

    @Column(precision = 12, scale = 2)
    private BigDecimal rate;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 200)
    private String vendorName;

    @Column(length = 200)
    private String billNumber;

    @Column(length = 500)
    private String attachmentPath;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_site_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private SiteEntity fromSite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_site_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private SiteEntity toSite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private SiteEntity site;

    @Column(nullable = false)
    private LocalDate transactionDate;

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

    public enum TransactionType {
        PURCHASE, SHIFTING, CONSUMPTION
    }
}
