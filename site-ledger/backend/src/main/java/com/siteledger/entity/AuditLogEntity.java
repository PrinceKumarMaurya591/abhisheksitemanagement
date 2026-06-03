package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Audit trail for all changes made in the system.
 * Records old value, new value, user, date, time for every change.
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user who made the change */
    @Column(nullable = false, length = 100)
    private String username;

    /** The user's role at the time of change */
    @Column(nullable = false, length = 30)
    private String userRole;

    /** Entity type: MATERIAL, LABOUR, ADVANCE, PAYMENT, LEDGER, DOCUMENT, USER, SITE */
    @Column(nullable = false, length = 50)
    private String entityType;

    /** The ID of the entity that was changed */
    @Column(nullable = false)
    private Long entityId;

    /** Action: CREATE, UPDATE, DELETE, SETTLE, SUSPEND, ACTIVATE */
    @Column(nullable = false, length = 30)
    private String action;

    /** Field name that was changed (for UPDATE actions) */
    @Column(length = 100)
    private String fieldName;

    /** Old value before the change */
    @Column(columnDefinition = "TEXT")
    private String oldValue;

    /** New value after the change */
    @Column(columnDefinition = "TEXT")
    private String newValue;

    /** Site ID if the change is site-specific */
    private Long siteId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
