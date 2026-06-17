package com.siteledger.repository;

import com.siteledger.entity.LedgerEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntryEntity, Long> {
    List<LedgerEntryEntity> findBySiteIdOrderByEntryDateDesc(Long siteId);

    List<LedgerEntryEntity> findBySiteIdAndEntryDateBetweenOrderByEntryDateDesc(
            Long siteId, LocalDate startDate, LocalDate endDate);

    List<LedgerEntryEntity> findBySiteIdAndCategoryOrderByEntryDateDesc(
            Long siteId, LedgerEntryEntity.Category category);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.site.id = :siteId AND l.entryType = 'CREDIT'")
    BigDecimal totalCreditBySite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.site.id = :siteId AND l.entryType = 'DEBIT'")
    BigDecimal totalDebitBySite(@Param("siteId") Long siteId);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.entryType = 'CREDIT'")
    BigDecimal totalCreditAll();

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.entryType = 'DEBIT'")
    BigDecimal totalDebitAll();

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.site.id IN :siteIds AND l.entryType = 'CREDIT'")
    BigDecimal totalCreditBySites(@Param("siteIds") List<Long> siteIds);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.site.id IN :siteIds AND l.entryType = 'DEBIT'")
    BigDecimal totalDebitBySites(@Param("siteIds") List<Long> siteIds);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.site.id = :siteId AND l.category = :category AND l.entryType = 'DEBIT'")
    BigDecimal totalExpenseBySiteAndCategory(@Param("siteId") Long siteId, @Param("category") LedgerEntryEntity.Category category);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.site.id IN :siteIds AND l.category = :category AND l.entryType = 'DEBIT'")
    BigDecimal totalExpenseBySitesAndCategory(@Param("siteIds") List<Long> siteIds, @Param("category") LedgerEntryEntity.Category category);
}
