package com.siteledger.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Getter
@Setter
@ToString(exclude = {"site", "user"})
@NoArgsConstructor
@AllArgsConstructor
public class DocumentEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocumentType documentType;

    @Column(nullable = false, length = 200)
    private String fileName;

    @Column(nullable = false, length = 500)
    private String filePath;

    /** File size in bytes */
    private Long fileSize;

    /** MIME content type */
    @Column(length = 100)
    private String contentType;

    @Column(length = 50)
    private String version;

    @Column(length = 500)
    private String description;

    /** Who uploaded this document */
    @Column(length = 100)
    private String uploadedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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
    }

    public enum DocumentType {
        TENDER_NOTICE, NIT, BOQ, CORRIGENDUM, DPR, ESTIMATE, RATE_ANALYSIS,
        AGREEMENT, WORK_ORDER, LAYOUT_DRAWING, STRUCTURAL_DRAWING, CROSS_SECTION,
        BEFORE_PHOTO, PROGRESS_PHOTO, COMPLETION_PHOTO, LETTER, OTHER
    }
}
