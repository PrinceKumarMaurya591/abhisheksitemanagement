package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Module-level permissions for OFFICE_ADMIN and SITE_STAFF roles.
 * Owner can ON/OFF modules for each user.
 */
@Entity
@Table(name = "permissions")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class PermissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private UserEntity user;

    /** Module name: MATERIAL, EXPENSE, LABOUR, MACHINERY, DOCUMENTS, REPORTS, USER_MANAGEMENT, BALANCE */
    @Column(nullable = false, length = 50)
    private String module;

    /** Permission: VIEW, ADD, EDIT, DELETE, SHIFTING, STOCK_VIEW */
    @Column(nullable = false, length = 50)
    private String permission;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
