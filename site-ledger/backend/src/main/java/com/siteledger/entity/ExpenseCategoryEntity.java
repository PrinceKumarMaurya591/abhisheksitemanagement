package com.siteledger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "expense_categories")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseCategoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String categoryName;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private Boolean isActive = true;

    /** Which levels this category applies to: YOJNA, SITE, STAFF */
    @ElementCollection(targetClass = ExpenseLevel.class)
    @CollectionTable(name = "expense_category_levels", joinColumns = @JoinColumn(name = "category_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "expense_level", length = 20)
    private List<ExpenseLevel> applicableLevels;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ExpenseLevel {
        YOJNA, SITE, STAFF
    }
}
