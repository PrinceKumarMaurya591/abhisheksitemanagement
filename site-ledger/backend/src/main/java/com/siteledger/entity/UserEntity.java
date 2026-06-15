package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(length = 100)
    private String fullName;

    @Column(length = 15)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean suspended = false;

    /** For OFFICE_ADMIN: FULL_ACCESS, SELECTED_SITE, VIEW_ONLY, PERMISSION_BASED */
    @Column(length = 30)
    private String accessType = "FULL_ACCESS";

    /** Comma-separated list of site IDs this user is assigned to */
    @Column(length = 1000)
    private String assignedSiteIds;

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

    public enum Role {
        OWNER, OFFICE_ADMIN, SITE_INCHARGE, MUNSHI, MATE, SUBCONTRACTOR, SUBCONTRACTOR_ADMIN
    }
}
