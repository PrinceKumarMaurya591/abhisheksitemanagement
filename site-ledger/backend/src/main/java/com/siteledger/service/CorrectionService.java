package com.siteledger.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.siteledger.entity.CorrectionRequestEntity;
import com.siteledger.entity.ExpenseEntity;
import com.siteledger.entity.LabourEntity;
import com.siteledger.entity.MaterialEntity;
import com.siteledger.entity.TransportEntity;
import com.siteledger.entity.MachineryEntity;
import com.siteledger.repository.CorrectionRequestRepository;
import com.siteledger.repository.ExpenseRepository;
import com.siteledger.repository.LabourRepository;
import com.siteledger.repository.MaterialRepository;
import com.siteledger.repository.TransportRepository;
import com.siteledger.repository.MachineryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Service
public class CorrectionService {

    private static final Logger log = LoggerFactory.getLogger(CorrectionService.class);

    private final CorrectionRequestRepository correctionRequestRepository;
    private final LabourRepository labourRepository;
    private final ExpenseRepository expenseRepository;
    private final MaterialRepository materialRepository;
    private final TransportRepository transportRepository;
    private final MachineryRepository machineryRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public CorrectionService(CorrectionRequestRepository correctionRequestRepository,
                              LabourRepository labourRepository,
                              ExpenseRepository expenseRepository,
                              MaterialRepository materialRepository,
                              TransportRepository transportRepository,
                              MachineryRepository machineryRepository,
                              AuditService auditService,
                              ObjectMapper objectMapper) {
        this.correctionRequestRepository = correctionRequestRepository;
        this.labourRepository = labourRepository;
        this.expenseRepository = expenseRepository;
        this.materialRepository = materialRepository;
        this.transportRepository = transportRepository;
        this.machineryRepository = machineryRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CorrectionRequestEntity requestCorrection(String entityType, Long entityId,
                                                       Long siteId, String reason,
                                                       String requestedBy) {
        String snapshot = captureSnapshot(entityType, entityId);
        CorrectionRequestEntity request = new CorrectionRequestEntity();
        request.setEntityType(entityType);
        request.setEntityId(entityId);
        request.setSiteId(siteId);
        request.setCorrectionReason(reason);
        request.setRequestedBy(requestedBy);
        request.setOriginalSnapshot(snapshot);
        request.setStatus(CorrectionRequestEntity.CorrectionStatus.PENDING);
        CorrectionRequestEntity saved = correctionRequestRepository.save(request);
        auditService.logCreate(requestedBy, "OFFICE_ADMIN", "CORRECTION_REQUEST", saved.getId(), siteId);
        log.info("Correction requested by {} for {} #{}: {}", requestedBy, entityType, entityId, reason);
        return saved;
    }

    @Transactional
    public CorrectionRequestEntity approveCorrection(Long requestId, Map<String, Object> correctedValues,
                                                       String resolvedBy) {
        CorrectionRequestEntity request = correctionRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Correction request not found: " + requestId));
        if (request.getStatus() != CorrectionRequestEntity.CorrectionStatus.PENDING) {
            throw new RuntimeException("Correction request is already " + request.getStatus());
        }
        applyCorrection(request.getEntityType(), request.getEntityId(), correctedValues);
        String correctedSnapshot = captureSnapshot(request.getEntityType(), request.getEntityId());
        request.setCorrectedSnapshot(correctedSnapshot);
        request.setStatus(CorrectionRequestEntity.CorrectionStatus.APPROVED);
        request.setResolvedBy(resolvedBy);
        request.setResolvedAt(LocalDateTime.now());
        CorrectionRequestEntity saved = correctionRequestRepository.save(request);
        auditService.logUpdate(resolvedBy, getRole(resolvedBy), request.getEntityType(),
                request.getEntityId(), "CORRECTION_APPROVED",
                "requestId: " + requestId, "corrected", request.getSiteId());
        log.info("Correction #{} approved by {} for {} #{}", requestId, resolvedBy,
                request.getEntityType(), request.getEntityId());
        return saved;
    }

    @Transactional
    public CorrectionRequestEntity rejectCorrection(Long requestId, String rejectionReason, String resolvedBy) {
        CorrectionRequestEntity request = correctionRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Correction request not found: " + requestId));
        if (request.getStatus() != CorrectionRequestEntity.CorrectionStatus.PENDING) {
            throw new RuntimeException("Correction request is already " + request.getStatus());
        }
        request.setStatus(CorrectionRequestEntity.CorrectionStatus.REJECTED);
        request.setRejectionReason(rejectionReason);
        request.setResolvedBy(resolvedBy);
        request.setResolvedAt(LocalDateTime.now());
        CorrectionRequestEntity saved = correctionRequestRepository.save(request);
        auditService.logUpdate(resolvedBy, getRole(resolvedBy), request.getEntityType(),
                request.getEntityId(), "CORRECTION_REJECTED",
                "requestId: " + requestId, "rejected: " + rejectionReason, request.getSiteId());
        log.info("Correction #{} rejected by {}: {}", requestId, resolvedBy, rejectionReason);
        return saved;
    }

    public List<CorrectionRequestEntity> getPendingCorrections(Long siteId) {
        if (siteId != null) {
            return correctionRequestRepository.findBySiteIdAndStatusOrderByCreatedAtDesc(
                    siteId, CorrectionRequestEntity.CorrectionStatus.PENDING);
        }
        return correctionRequestRepository.findByStatusOrderByCreatedAtDesc(CorrectionRequestEntity.CorrectionStatus.PENDING);
    }

    public List<CorrectionRequestEntity> getCorrectionHistory(String entityType, Long entityId) {
        return correctionRequestRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }

    public List<CorrectionRequestEntity> getAllCorrections(Long siteId) {
        if (siteId != null) {
            return correctionRequestRepository.findBySiteIdOrderByCreatedAtDesc(siteId);
        }
        return correctionRequestRepository.findAll();
    }

    // ==================== PRIVATE HELPERS ====================

    private String captureSnapshot(String entityType, Long entityId) {
        try {
            Object entity = findEntity(entityType, entityId);
            if (entity == null) return "{}";
            return objectMapper.writeValueAsString(entity);
        } catch (JsonProcessingException e) {
            log.error("Failed to capture snapshot for {} #{}: {}", entityType, entityId, e.getMessage());
            return "{}";
        }
    }

    private void applyCorrection(String entityType, Long entityId, Map<String, Object> correctedValues) {
        switch (entityType.toUpperCase()) {
            case "LABOUR" -> applyLabourCorrection(entityId, correctedValues);
            case "EXPENSE" -> applyExpenseCorrection(entityId, correctedValues);
            case "MATERIAL" -> applyMaterialCorrection(entityId, correctedValues);
            case "TRANSPORT" -> applyTransportCorrection(entityId, correctedValues);
            case "MACHINERY" -> applyMachineryCorrection(entityId, correctedValues);
            default -> throw new RuntimeException("Unknown entity type: " + entityType);
        }
    }

    private void applyLabourCorrection(Long entityId, Map<String, Object> values) {
        labourRepository.findById(entityId).ifPresent(entity -> {
            setStr(values, "labourName", entity::setLabourName);
            setStr(values, "category", entity::setCategory);
            setInt(values, "attendanceCount", entity::setAttendanceCount);
            setDec(values, "amount", entity::setAmount);
            setDec(values, "rate", entity::setRate);
            setStr(values, "remarks", entity::setRemarks);
            labourRepository.save(entity);
        });
    }

    private void applyExpenseCorrection(Long entityId, Map<String, Object> values) {
        expenseRepository.findById(entityId).ifPresent(entity -> {
            setStr(values, "expenseType", entity::setExpenseType);
            setDec(values, "amount", entity::setAmount);
            setStr(values, "remarks", entity::setRemarks);
            setStr(values, "paymentSource", entity::setPaymentSource);
            setStr(values, "vendorName", entity::setVendorName);
            expenseRepository.save(entity);
        });
    }

    private void applyMaterialCorrection(Long entityId, Map<String, Object> values) {
        materialRepository.findById(entityId).ifPresent(entity -> {
            setStr(values, "materialName", entity::setMaterialName);
            setDec(values, "purchasedQty", entity::setPurchasedQty);
            setDec(values, "rate", entity::setRate);
            setStr(values, "unit", entity::setUnit);
            materialRepository.save(entity);
        });
    }

    private void applyTransportCorrection(Long entityId, Map<String, Object> values) {
        transportRepository.findById(entityId).ifPresent(entity -> {
            setStr(values, "vehicleType", entity::setVehicleType);
            setStr(values, "vehicleNumber", entity::setVehicleNumber);
            setStr(values, "vendorName", entity::setVendorName);
            setStr(values, "remarks", entity::setRemarks);
            setInt(values, "trips", entity::setTrips);
            setDec(values, "quantity", entity::setQuantity);
            setStr(values, "unit", entity::setUnit);
            setDec(values, "rate", entity::setRate);
            setDec(values, "totalAmount", entity::setTotalAmount);
            transportRepository.save(entity);
        });
    }

    private void applyMachineryCorrection(Long entityId, Map<String, Object> values) {
        machineryRepository.findById(entityId).ifPresent(entity -> {
            setStr(values, "machineName", entity::setMachineName);
            setStr(values, "vendorName", entity::setVendorName);
            setStr(values, "vehicleNumber", entity::setVehicleNumber);
            setStr(values, "remarks", entity::setRemarks);
            setStr(values, "rentalType", entity::setRentalType);
            setDec(values, "hours", entity::setHours);
            setDec(values, "dailyRate", entity::setDailyRate);
            setInt(values, "daysCount", entity::setDaysCount);
            setDec(values, "rate", entity::setRate);
            setDec(values, "totalAmount", entity::setTotalAmount);
            machineryRepository.save(entity);
        });
    }

    private Object findEntity(String entityType, Long entityId) {
        return switch (entityType.toUpperCase()) {
            case "LABOUR" -> labourRepository.findById(entityId).orElse(null);
            case "EXPENSE" -> expenseRepository.findById(entityId).orElse(null);
            case "MATERIAL" -> materialRepository.findById(entityId).orElse(null);
            case "TRANSPORT" -> transportRepository.findById(entityId).orElse(null);
            case "MACHINERY" -> machineryRepository.findById(entityId).orElse(null);
            default -> null;
        };
    }

    private void setStr(Map<String, Object> map, String key, Consumer<String> setter) {
        Object val = map.get(key);
        if (val instanceof String s) setter.accept(s);
    }

    private void setInt(Map<String, Object> map, String key, Consumer<Integer> setter) {
        Object val = map.get(key);
        if (val instanceof Integer i) setter.accept(i);
        else if (val instanceof Number n) setter.accept(n.intValue());
        else if (val instanceof String s) { try { setter.accept(Integer.parseInt(s)); } catch (NumberFormatException ignored) {} }
    }

    private void setDec(Map<String, Object> map, String key, Consumer<BigDecimal> setter) {
        Object val = map.get(key);
        if (val instanceof Number n) setter.accept(BigDecimal.valueOf(n.doubleValue()));
        else if (val instanceof String s) { try { setter.accept(new BigDecimal(s)); } catch (NumberFormatException ignored) {} }
    }

    private String getRole(String username) {
        return "OWNER";
    }
}
