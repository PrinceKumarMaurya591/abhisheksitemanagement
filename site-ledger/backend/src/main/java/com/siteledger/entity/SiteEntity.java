package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "sites")
@Getter
@Setter
@ToString(exclude = {"assignedStaff", "yojna"})
@NoArgsConstructor
@AllArgsConstructor
public class SiteEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String siteName;

    @Column(length = 200)
    private String department;

    @Column(length = 200)
    private String workName;

    @Column(precision = 15, scale = 2)
    private BigDecimal contractValue;

    @Column(length = 100)
    private String workOrderNumber;

    private LocalDate startDate;

    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private SiteStatus status = SiteStatus.ACTIVE;

    @Column(length = 500)
    private String address;

    /** District where the site/project is located */
    @Column(length = 100)
    private String district;

    /** Parent Yojna (Nikay/Scheme) this site belongs to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "yojna_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "sites", "description", "department", "startDate", "endDate", "status", "createdAt", "updatedAt"})
    private YojnaEntity yojna;

    @ManyToMany
    @JoinTable(name = "site_assigned_staff",
            joinColumns = @JoinColumn(name = "site_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<UserEntity> assignedStaff = new HashSet<>();

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

    public enum SiteStatus {
        ACTIVE, COMPLETED, ON_HOLD, CANCELLED, ARCHIVED
    }
}
