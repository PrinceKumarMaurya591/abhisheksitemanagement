package com.siteledger.repository;

import com.siteledger.entity.SiteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SiteRepository extends JpaRepository<SiteEntity, Long> {

    @Query("SELECT s FROM SiteEntity s LEFT JOIN FETCH s.yojna")
    List<SiteEntity> findAllWithYojna();

    @Query("SELECT s FROM SiteEntity s LEFT JOIN FETCH s.yojna WHERE s.id IN :ids")
    List<SiteEntity> findAllByIdWithYojna(@Param("ids") List<Long> ids);

    List<SiteEntity> findByStatus(SiteEntity.SiteStatus status);

    @Query("SELECT s FROM SiteEntity s LEFT JOIN FETCH s.yojna WHERE s.yojna.id = :yojnaId")
    List<SiteEntity> findByYojnaId(@Param("yojnaId") Long yojnaId);

    @Query("SELECT s FROM SiteEntity s JOIN s.assignedStaff u WHERE u.id = :userId")
    List<SiteEntity> findByAssignedStaffId(Long userId);

    long countByStatus(SiteEntity.SiteStatus status);
}
