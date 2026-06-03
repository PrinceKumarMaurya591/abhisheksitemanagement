package com.siteledger.repository;

import com.siteledger.entity.LabourEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface LabourRepository extends JpaRepository<LabourEntity, Long> {
    List<LabourEntity> findBySiteIdOrderByDateDesc(Long siteId);

    List<LabourEntity> findBySiteIdAndDateBetweenOrderByDateDesc(
            Long siteId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LabourEntity l WHERE l.site.id = :siteId")
    BigDecimal totalLabourCostBySite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LabourEntity l WHERE l.site.id = :siteId AND l.date BETWEEN :start AND :end")
    BigDecimal totalLabourCostBySiteAndDateRange(
            @Param("siteId") Long siteId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
