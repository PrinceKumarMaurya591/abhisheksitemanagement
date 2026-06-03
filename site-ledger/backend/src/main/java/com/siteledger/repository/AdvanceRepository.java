package com.siteledger.repository;

import com.siteledger.entity.AdvanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface AdvanceRepository extends JpaRepository<AdvanceEntity, Long> {
    List<AdvanceEntity> findBySiteIdOrderByDateDesc(Long siteId);

    List<AdvanceEntity> findByStatus(AdvanceEntity.AdvanceStatus status);

    @Query("SELECT COALESCE(SUM(a.amount), 0) FROM AdvanceEntity a WHERE a.site.id = :siteId")
    BigDecimal totalAdvanceBySite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(a.amount), 0) FROM AdvanceEntity a WHERE a.status = 'OPEN'")
    BigDecimal totalOutstandingAdvances();
}
