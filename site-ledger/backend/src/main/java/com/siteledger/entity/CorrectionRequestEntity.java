package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Correction Request — Office/Admin requests correction to a field entry.
 * Workflow: Office requests → Staff/Admin approves/rejects → Audit trail preserved.
 */
@Entity
@Table(name = "correction_requests")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class CorrectionRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** LABOUR, EXPENSE, MATERIAL, TRANSPORT, MACHINERY, etc. */
    @Column(nullable = false, length = 50)
    private String entityType;

    /** ID of the entry that needs correction */
    @Column(nullable = false)
    private Long entityId;

    @Column(nullable = false)
    private Long siteId;

    /** Office/Admin username who requested the correction */
    @Column(nullable = false, length = 100)
    private String requestedBy;

    /** Reason for requesting correction */
    @Column(nullable = false, length = 1000)
    private String correctionReason;

    /** JSON snapshot of original entry values (before correction) */
    @Column(columnDefinition = "TEXT")
    private String originalSnapshot;

    /** JSON of corrected/final values (after correction is applied) */
    @Column(columnDefinition = "TEXT")
    private String correctedSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CorrectionStatus status = CorrectionStatus.PENDING;

    /** Who resolved (approved/rejected) this correction */
    @Column(length = 100)
    private String resolvedBy;

    /** Rejection reason (if rejected) */
    @Column(length = 1000)
    private String rejectionReason;

    private LocalDateTime resolvedAt;

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

    public enum CorrectionStatus {
        PENDING, APPROVED, REJECTED
    }
}
