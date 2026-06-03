package com.siteledger.repository;

import com.siteledger.entity.AdvanceExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface AdvanceExpenseRepository extends JpaRepository<AdvanceExpenseEntity, Long> {
    List<AdvanceExpenseEntity> findByAdvanceIdOrderByExpenseDateDesc(Long advanceId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM AdvanceExpenseEntity e WHERE e.advance.id = :advanceId")
    BigDecimal totalExpenseByAdvance(@Param("advanceId") Long advanceId);
}
