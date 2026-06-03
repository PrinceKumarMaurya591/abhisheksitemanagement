package com.siteledger.repository;

import com.siteledger.entity.MachineryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface MachineryRepository extends JpaRepository<MachineryEntity, Long> {
    List<MachineryEntity> findBySiteIdOrderByDateDesc(Long siteId);

    List<MachineryEntity> findBySiteIdAndDateBetweenOrderByDateDesc(
            Long siteId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(m.totalAmount), 0) FROM MachineryEntity m WHERE m.site.id = :siteId")
    BigDecimal totalMachineryCostBySite(@Param("siteId") Long siteId);
}
