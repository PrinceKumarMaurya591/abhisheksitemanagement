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
import com.siteledger.service.TimeAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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

        List<MaterialEntity> materials = materialRepository.findBySiteId(siteId);

        // MUNSHI/MATE can only see entries they created themselves, within 24-hour window
        if (user.getRole() == UserEntity.Role.MUNSHI || user.getRole() == UserEntity.Role.MATE) {
            materials = materials.stream()
                    .filter(m -> username.equals(m.getCreatedBy()))
                    .filter(m -> m.getCreatedAt() != null
                            && java.time.Duration.between(m.getCreatedAt(), java.time.LocalDateTime.now()).toHours() < 24)
                    .toList();
        }

        return ResponseEntity.ok(ApiResponse.success(materials));
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

        // For MUNSHI/MATE: validate they are assigned to the target site
        if (user.getRole() == UserEntity.Role.MUNSHI || user.getRole() == UserEntity.Role.MATE) {
            if (material.getSite() == null || material.getSite().getId() == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Site is required"));
            }
            String assignedSites = user.getAssignedSiteIds();
            if (assignedSites == null || assignedSites.isBlank()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("You are not assigned to any site"));
            }
            Set<String> assignedSiteSet = Arrays.stream(assignedSites.split(","))
                    .map(String::trim)
                    .collect(Collectors.toSet());
            if (!assignedSiteSet.contains(String.valueOf(material.getSite().getId()))) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: You can only add material to your assigned site(s)"));
            }
        }

        material.setPurchasedQty(material.getPurchasedQty() != null ? material.getPurchasedQty() : BigDecimal.ZERO);
        material.setShiftedQty(BigDecimal.ZERO);
        material.setConsumedQty(BigDecimal.ZERO);
        material.setBalanceQty(material.getPurchasedQty());
        material.setCreatedBy(username);

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

    @GetMapping("/transactions/site/{siteId}")
    public ResponseEntity<ApiResponse<List<MaterialTransactionEntity>>> getSiteMaterialTransactions(
            @PathVariable Long siteId) {
        return ResponseEntity.ok(ApiResponse.success(
                transactionRepository.findBySiteIdOrderByTransactionDateDesc(siteId)));
    }

    @GetMapping("/transactions/material/{materialId}")
    public ResponseEntity<ApiResponse<List<MaterialTransactionEntity>>> getMaterialTransactions(
            @PathVariable Long materialId) {
        return ResponseEntity.ok(ApiResponse.success(
                transactionRepository.findByMaterialIdOrderByTransactionDateDesc(materialId)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MaterialEntity>> updateMaterial(
            @PathVariable Long id, @RequestBody MaterialEntity material, Authentication auth) {
        String username = auth.getName();
        return materialRepository.findById(id).map(existing -> {
            material.setId(id);
            material.setCreatedAt(existing.getCreatedAt());
            material.setCreatedBy(existing.getCreatedBy());

            // Preserve auto-calculated fields
            BigDecimal purchased = material.getPurchasedQty() != null ? material.getPurchasedQty() : existing.getPurchasedQty();
            BigDecimal shifted = material.getShiftedQty() != null ? material.getShiftedQty() : existing.getShiftedQty();
            BigDecimal consumed = material.getConsumedQty() != null ? material.getConsumedQty() : existing.getConsumedQty();
            material.setPurchasedQty(purchased);
            material.setShiftedQty(shifted);
            material.setConsumedQty(consumed);
            material.setBalanceQty(purchased.subtract(shifted).subtract(consumed));

            return ResponseEntity.ok(ApiResponse.success("Material updated",
                    materialRepository.save(material)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMaterial(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user != null && (user.getRole() == UserEntity.Role.OWNER || user.getRole() == UserEntity.Role.OFFICE_ADMIN)) {
            materialRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.success("Material deleted", null));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error("Access denied"));
    }
}
