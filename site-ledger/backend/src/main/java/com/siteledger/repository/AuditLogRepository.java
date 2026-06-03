package com.siteledger.repository;

import com.siteledger.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

    List<AuditLogEntity> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);

    List<AuditLogEntity> findBySiteIdOrderByCreatedAtDesc(Long siteId);

    List<AuditLogEntity> findByUsernameOrderByCreatedAtDesc(String username);

    List<AuditLogEntity> findAllByOrderByCreatedAtDesc();
}
