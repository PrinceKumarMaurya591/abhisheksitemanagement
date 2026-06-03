package com.siteledger.repository;

import com.siteledger.entity.BalanceLedgerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface BalanceLedgerRepository extends JpaRepository<BalanceLedgerEntity, Long> {
    List<BalanceLedgerEntity> findByStaffUserIdOrderByCreatedAtDesc(Long staffUserId);

    List<BalanceLedgerEntity> findByStaffUserIdAndSiteIdOrderByCreatedAtDesc(Long staffUserId, Long siteId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM BalanceLedgerEntity b WHERE b.staffUser.id = :staffUserId AND b.transactionType = 'RECEIVED'")
    BigDecimal totalReceivedByStaff(@Param("staffUserId") Long staffUserId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM BalanceLedgerEntity b WHERE b.staffUser.id = :staffUserId AND b.transactionType = 'EXPENSE'")
    BigDecimal totalExpenseByStaff(@Param("staffUserId") Long staffUserId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM BalanceLedgerEntity b WHERE b.staffUser.id = :staffUserId AND b.transactionType = 'RECEIVED' AND b.site.id = :siteId")
    BigDecimal totalReceivedByStaffAndSite(@Param("staffUserId") Long staffUserId, @Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM BalanceLedgerEntity b WHERE b.staffUser.id = :staffUserId AND b.transactionType = 'EXPENSE' AND b.site.id = :siteId")
    BigDecimal totalExpenseByStaffAndSite(@Param("staffUserId") Long staffUserId, @Param("siteId") Long siteId);
}
