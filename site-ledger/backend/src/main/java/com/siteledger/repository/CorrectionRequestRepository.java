package com.siteledger.repository;

import com.siteledger.entity.CorrectionRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CorrectionRequestRepository extends JpaRepository<CorrectionRequestEntity, Long> {

    List<CorrectionRequestEntity> findBySiteIdOrderByCreatedAtDesc(Long siteId);

    List<CorrectionRequestEntity> findByStatusOrderByCreatedAtDesc(CorrectionRequestEntity.CorrectionStatus status);

    List<CorrectionRequestEntity> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);

    List<CorrectionRequestEntity> findBySiteIdAndStatusOrderByCreatedAtDesc(Long siteId, CorrectionRequestEntity.CorrectionStatus status);

    long countByStatus(CorrectionRequestEntity.CorrectionStatus status);
}
