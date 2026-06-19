package com.siteledger.repository;

import com.siteledger.entity.MaterialShiftingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface MaterialShiftingRepository extends JpaRepository<MaterialShiftingEntity, Long> {

    List<MaterialShiftingEntity> findByToSiteIdOrderByDateDesc(Long toSiteId);

    List<MaterialShiftingEntity> findByFromSiteIdOrderByDateDesc(Long fromSiteId);

    List<MaterialShiftingEntity> findByMaterialNameAndToSiteIdOrderByDateDesc(String materialName, Long toSiteId);

    @Query("SELECT COALESCE(SUM(ms.totalQuantity), 0) FROM MaterialShiftingEntity ms WHERE ms.toSiteId = :siteId")
    BigDecimal totalQuantityShiftedToSite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(ms.totalTransportCost), 0) FROM MaterialShiftingEntity ms WHERE ms.toSiteId = :siteId")
    BigDecimal totalTransportCostToSite(@Param("siteId") Long siteId);
}
