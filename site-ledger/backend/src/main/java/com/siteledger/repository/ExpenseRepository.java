package com.siteledger.repository;

import com.siteledger.entity.ExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<ExpenseEntity, Long> {
    List<ExpenseEntity> findBySiteIdOrderByDateDesc(Long siteId);

    List<ExpenseEntity> findBySiteIdAndDateBetweenOrderByDateDesc(
            Long siteId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM ExpenseEntity e WHERE e.site.id = :siteId")
    BigDecimal totalExpenseBySite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM ExpenseEntity e WHERE e.site.id = :siteId AND e.paymentSource = :source")
    BigDecimal totalExpenseBySiteAndSource(@Param("siteId") Long siteId, @Param("source") String source);
}
