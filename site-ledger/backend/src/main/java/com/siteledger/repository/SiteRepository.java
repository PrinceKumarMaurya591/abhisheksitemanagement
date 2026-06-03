package com.siteledger.repository;

import com.siteledger.entity.SiteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SiteRepository extends JpaRepository<SiteEntity, Long> {
    List<SiteEntity> findByStatus(SiteEntity.SiteStatus status);

    @Query("SELECT s FROM SiteEntity s JOIN s.assignedStaff u WHERE u.id = :userId")
    List<SiteEntity> findByAssignedStaffId(Long userId);

    long countByStatus(SiteEntity.SiteStatus status);
}
