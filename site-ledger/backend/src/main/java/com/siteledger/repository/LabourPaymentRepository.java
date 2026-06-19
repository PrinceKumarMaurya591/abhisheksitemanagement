package com.siteledger.repository;

import com.siteledger.entity.LabourPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface LabourPaymentRepository extends JpaRepository<LabourPaymentEntity, Long> {

    List<LabourPaymentEntity> findBySiteIdOrderByPaymentDateDesc(Long siteId);

    List<LabourPaymentEntity> findByLabourRegistrationIdOrderByPaymentDateDesc(Long labourRegistrationId);

    List<LabourPaymentEntity> findBySiteIdAndPayPeriodOrderByPaymentDateDesc(Long siteId, String payPeriod);

    @Query("SELECT COALESCE(SUM(lp.netPayable), 0) FROM LabourPaymentEntity lp WHERE lp.siteId = :siteId")
    BigDecimal totalPaidBySite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(lp.netPayable), 0) FROM LabourPaymentEntity lp " +
           "WHERE lp.siteId = :siteId AND lp.payPeriod = :payPeriod")
    BigDecimal totalPaidBySiteAndPeriod(@Param("siteId") Long siteId, @Param("payPeriod") String payPeriod);

    long countBySiteIdAndSyncedToLedgerFalse(Long siteId);
}
