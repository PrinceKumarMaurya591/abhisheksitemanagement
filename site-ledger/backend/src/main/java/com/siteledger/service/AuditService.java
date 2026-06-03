package com.siteledger.service;

import com.siteledger.entity.AuditLogEntity;
import com.siteledger.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String username, String userRole, String entityType, Long entityId,
                    String action, String fieldName, String oldValue, String newValue, Long siteId) {
        AuditLogEntity log = new AuditLogEntity();
        log.setUsername(username);
        log.setUserRole(userRole);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setFieldName(fieldName);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        log.setSiteId(siteId);
        auditLogRepository.save(log);
    }

    public void logCreate(String username, String userRole, String entityType, Long entityId, Long siteId) {
        log(username, userRole, entityType, entityId, "CREATE", null, null, null, siteId);
    }

    public void logUpdate(String username, String userRole, String entityType, Long entityId,
                          String fieldName, String oldValue, String newValue, Long siteId) {
        log(username, userRole, entityType, entityId, "UPDATE", fieldName, oldValue, newValue, siteId);
    }

    public void logDelete(String username, String userRole, String entityType, Long entityId, Long siteId) {
        log(username, userRole, entityType, entityId, "DELETE", null, null, null, siteId);
    }

    public List<AuditLogEntity> getAuditLogs(String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }

    public List<AuditLogEntity> getSiteAuditLogs(Long siteId) {
        return auditLogRepository.findBySiteIdOrderByCreatedAtDesc(siteId);
    }

    public List<AuditLogEntity> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
