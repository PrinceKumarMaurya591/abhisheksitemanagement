package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "yojnas")
@Getter
@Setter
@ToString(exclude = {"sites"})
@NoArgsConstructor
@AllArgsConstructor
public class YojnaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String yojnaName;

    @Column(length = 500)
    private String description;

    @Column(length = 200)
    private String department;

    private LocalDate startDate;

    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private YojnaStatus status = YojnaStatus.ACTIVE;

    @OneToMany(mappedBy = "yojna", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<SiteEntity> sites = new ArrayList<>();

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

    public enum YojnaStatus {
        ACTIVE, INACTIVE
    }
}
