package com.siteledger.repository;

import com.siteledger.entity.TransportEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransportRepository extends JpaRepository<TransportEntity, Long> {
    List<TransportEntity> findBySiteIdOrderByDateDesc(Long siteId);

    List<TransportEntity> findBySiteIdAndDateBetweenOrderByDateDesc(
            Long siteId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.totalAmount), 0) FROM TransportEntity t WHERE t.site.id = :siteId")
    BigDecimal totalTransportCostBySite(@Param("siteId") Long siteId);
}
