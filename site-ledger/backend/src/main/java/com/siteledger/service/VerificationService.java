package com.siteledger.service;

import com.siteledger.entity.ExpenseEntity;
import com.siteledger.entity.LabourEntity;
import com.siteledger.repository.ExpenseRepository;
import com.siteledger.repository.LabourRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service for Office Verification workflow.
 * Verification: Office reviews field entries and marks them as verified.
 */
@Service
public class VerificationService {

    private final LabourRepository labourRepository;
    private final ExpenseRepository expenseRepository;
    private final AuditService auditService;

    public VerificationService(LabourRepository labourRepository,
                                ExpenseRepository expenseRepository,
                                AuditService auditService) {
        this.labourRepository = labourRepository;
        this.expenseRepository = expenseRepository;
        this.auditService = auditService;
    }

    /**
     * Verify a labour entry.
     */
    @Transactional
    public LabourEntity verifyLabour(Long entityId, String verifiedBy) {
        LabourEntity entity = labourRepository.findById(entityId)
                .orElseThrow(() -> new RuntimeException("Labour entry not found: " + entityId));
        entity.setVerified(true);
        entity.setVerifiedAt(LocalDateTime.now());
        entity.setVerifiedBy(verifiedBy);
        LabourEntity saved = labourRepository.save(entity);
        auditService.logUpdate(verifiedBy, "OFFICE_ADMIN", "LABOUR", entityId,
                "verified", "false", "true",
                saved.getSite() != null ? saved.getSite().getId() : null);
        return saved;
    }

    /**
     * Verify an expense entry.
     */
    @Transactional
    public ExpenseEntity verifyExpense(Long entityId, String verifiedBy) {
        ExpenseEntity entity = expenseRepository.findById(entityId)
                .orElseThrow(() -> new RuntimeException("Expense entry not found: " + entityId));
        entity.setVerified(true);
        entity.setVerifiedAt(LocalDateTime.now());
        entity.setVerifiedBy(verifiedBy);
        ExpenseEntity saved = expenseRepository.save(entity);
        auditService.logUpdate(verifiedBy, "OFFICE_ADMIN", "EXPENSE", entityId,
                "verified", "false", "true",
                saved.getSite() != null ? saved.getSite().getId() : null);
        return saved;
    }
}
