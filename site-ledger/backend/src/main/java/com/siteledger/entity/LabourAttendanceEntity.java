package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Daily Attendance — Simple A (Present) / P (Absent) per labourer per date.
 * Munshi marks only Present/Absent. No other fields needed.
 */
@Entity
@Table(name = "labour_attendances", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"labour_registration_id", "date"})
})
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class LabourAttendanceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "labour_registration_id", nullable = false)
    private Long labourRegistrationId;

    @Column(nullable = false)
    private Long siteId;

    @Column(nullable = false)
    private LocalDate date;

    /** true = Present (A), false = Absent (P) */
    @Column(nullable = false)
    private boolean present;

    @Column(length = 100)
    private String markedBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
