package com.siteledger.repository;

import com.siteledger.entity.PaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {
    List<PaymentEntity> findBySiteIdOrderByBillDateDesc(Long siteId);

    @Query("SELECT COALESCE(SUM(p.billAmount), 0) FROM PaymentEntity p WHERE p.site.id = :siteId")
    BigDecimal totalBillsBySite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(p.paymentAmount), 0) FROM PaymentEntity p WHERE p.site.id = :siteId")
    BigDecimal totalPaymentsBySite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(p.pendingAmount), 0) FROM PaymentEntity p WHERE p.site.id = :siteId")
    BigDecimal totalPendingBySite(@Param("siteId") Long siteId);
}
