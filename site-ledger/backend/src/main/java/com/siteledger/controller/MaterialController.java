package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.MaterialEntity;
import com.siteledger.entity.MaterialTransactionEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.MaterialRepository;
import com.siteledger.repository.MaterialTransactionRepository;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialRepository materialRepository;
    private final MaterialTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    public MaterialController(MaterialRepository materialRepository,
                              MaterialTransactionRepository transactionRepository,
                              UserRepository userRepository,
                              PermissionRepository permissionRepository,
                              AuditService auditService) {
        this.materialRepository = materialRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<MaterialEntity>>> getSiteMaterials(@PathVariable Long siteId,
                                                                               Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check VIEW permission for non-OWNER/OFFICE_ADMIN
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canView = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "MATERIAL", "VIEW");
            if (!canView) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No MATERIAL VIEW permission"));
            }
        }

        return ResponseEntity.ok(ApiResponse.success(materialRepository.findBySiteId(siteId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaterialEntity>> createMaterial(@RequestBody MaterialEntity material,
                                                                       Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check ADD permission for non-OWNER/OFFICE_ADMIN
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canAdd = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "MATERIAL", "ADD");
            if (!canAdd) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No MATERIAL ADD permission"));
            }
        }

        material.setPurchasedQty(material.getPurchasedQty() != null ? material.getPurchasedQty() : BigDecimal.ZERO);
        material.setShiftedQty(BigDecimal.ZERO);
        material.setConsumedQty(BigDecimal.ZERO);
        material.setBalanceQty(material.getPurchasedQty());

        MaterialEntity saved = materialRepository.save(material);

        // Auto-create purchase transaction if quantity > 0
        if (saved.getPurchasedQty().compareTo(BigDecimal.ZERO) > 0) {
            MaterialTransactionEntity txn = new MaterialTransactionEntity();
            txn.setMaterial(saved);
            txn.setSite(saved.getSite());
            txn.setUser(user);
            txn.setTransactionType(MaterialTransactionEntity.TransactionType.PURCHASE);
            txn.setQuantity(saved.getPurchasedQty());
            txn.setTransactionDate(java.time.LocalDate.now());
            transactionRepository.save(txn);
        }

        // Audit log
        auditService.logCreate(username, user.getRole().name(), "MATERIAL", saved.getId(),
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Material created", saved));
    }

    @PostMapping("/purchase")
    public ResponseEntity<ApiResponse<MaterialTransactionEntity>> purchaseMaterial(
            @RequestBody MaterialTransactionEntity transaction, Authentication auth) {
        return processTransaction(transaction, MaterialTransactionEntity.TransactionType.PURCHASE, auth);
    }

    @PostMapping("/shift")
    public ResponseEntity<ApiResponse<MaterialTransactionEntity>> shiftMaterial(
            @RequestBody MaterialTransactionEntity transaction, Authentication auth) {
        return processTransaction(transaction, MaterialTransactionEntity.TransactionType.SHIFTING, auth);
    }

    @PostMapping("/consume")
    public ResponseEntity<ApiResponse<MaterialTransactionEntity>> consumeMaterial(
            @RequestBody MaterialTransactionEntity transaction, Authentication auth) {
        return processTransaction(transaction, MaterialTransactionEntity.TransactionType.CONSUMPTION, auth);
    }

    private ResponseEntity<ApiResponse<MaterialTransactionEntity>> processTransaction(
            MaterialTransactionEntity transaction, MaterialTransactionEntity.TransactionType type,
            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        transaction.setTransactionType(type);
        transaction.setTransactionDate(java.time.LocalDate.now());
        transaction.setUser(user);

        MaterialTransactionEntity saved = transactionRepository.save(transaction);

        // Update material quantities
        materialRepository.findById(transaction.getMaterial().getId()).ifPresent(material -> {
            switch (type) {
                case PURCHASE:
                    material.setPurchasedQty(material.getPurchasedQty().add(transaction.getQuantity()));
                    break;
                case SHIFTING:
                    material.setShiftedQty(material.getShiftedQty().add(transaction.getQuantity()));
                    break;
                case CONSUMPTION:
                    material.setConsumedQty(material.getConsumedQty().add(transaction.getQuantity()));
                    break;
            }
            material.setBalanceQty(material.getPurchasedQty()
                    .subtract(material.getShiftedQty())
                    .subtract(material.getConsumedQty()));
            materialRepository.save(material);
        });

        auditService.logCreate(username, user.getRole().name(), "MATERIAL_TRANSACTION", saved.getId(),
                transaction.getSite() != null ? transaction.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Transaction recorded", saved));
    }

    @GetMapping("/transactions/material/{materialId}")
    public ResponseEntity<ApiResponse<List<MaterialTransactionEntity>>> getMaterialTransactions(
            @PathVariable Long materialId) {
        return ResponseEntity.ok(ApiResponse.success(transactionRepository.findByMaterialIdOrderByTransactionDateDesc(materialId)));
    }
}
