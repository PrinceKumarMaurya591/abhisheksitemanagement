package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.SubcontractorWorkEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.SubcontractorWorkRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/subcontractor-work")
public class SubcontractorWorkController {

    private final SubcontractorWorkRepository workRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final Path uploadDir;

    public SubcontractorWorkController(SubcontractorWorkRepository workRepository,
                                       UserRepository userRepository,
                                       AuditService auditService,
                                       @Value("${app.upload.dir}") String uploadDirPath) {
        this.workRepository = workRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.uploadDir = Paths.get(uploadDirPath).toAbsolutePath().normalize().resolve("subcontractor-photos");
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create subcontractor photos directory: " + this.uploadDir, e);
        }
    }

    /**
     * Get work entries for a specific site.
     * SUBCONTRACTOR sees only their own entries.
     * SUBCONTRACTOR_ADMIN, OWNER, OFFICE_ADMIN see all entries for the site.
     */
    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<SubcontractorWorkEntity>>> getSiteWork(@PathVariable Long siteId,
                                                                                   Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        List<SubcontractorWorkEntity> workList;
        if (user.getRole() == UserEntity.Role.SUBCONTRACTOR) {
            // Subcontractor sees only their own entries
            workList = workRepository.findBySubcontractorIdAndSiteIdOrderByWorkDateDesc(user.getId(), siteId);
        } else {
            // OWNER, OFFICE_ADMIN, SUBCONTRACTOR_ADMIN see all
            workList = workRepository.findBySiteIdOrderByWorkDateDesc(siteId);
        }

        return ResponseEntity.ok(ApiResponse.success(workList));
    }

    /**
     * Get work entries for the currently logged-in SUBCONTRACTOR.
     * If siteId is provided, filter by site.
     */
    @GetMapping("/my-work")
    public ResponseEntity<ApiResponse<List<SubcontractorWorkEntity>>> getMyWork(
            @RequestParam(required = false) Long siteId,
            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        List<SubcontractorWorkEntity> workList;
        if (siteId != null) {
            workList = workRepository.findBySubcontractorIdAndSiteIdOrderByWorkDateDesc(user.getId(), siteId);
        } else {
            workList = workRepository.findBySubcontractorIdOrderByWorkDateDesc(user.getId());
        }

        return ResponseEntity.ok(ApiResponse.success(workList));
    }

    /**
     * Get work entries for a specific subcontractor (for SUBCONTRACTOR_ADMIN, OWNER, OFFICE_ADMIN).
     */
    @GetMapping("/subcontractor/{subcontractorId}")
    public ResponseEntity<ApiResponse<List<SubcontractorWorkEntity>>> getSubcontractorWork(
            @PathVariable Long subcontractorId,
            @RequestParam(required = false) Long siteId,
            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER, OFFICE_ADMIN, SUBCONTRACTOR_ADMIN can view other subcontractors' work
        if (user.getRole() != UserEntity.Role.OWNER &&
            user.getRole() != UserEntity.Role.OFFICE_ADMIN &&
            user.getRole() != UserEntity.Role.SUBCONTRACTOR_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied"));
        }

        List<SubcontractorWorkEntity> workList;
        if (siteId != null) {
            workList = workRepository.findBySubcontractorIdAndSiteIdOrderByWorkDateDesc(subcontractorId, siteId);
        } else {
            workList = workRepository.findBySubcontractorIdOrderByWorkDateDesc(subcontractorId);
        }

        return ResponseEntity.ok(ApiResponse.success(workList));
    }

    /**
     * Create a subcontractor work entry.
     * SUBCONTRACTOR can create their own entries.
     * SUBCONTRACTOR_ADMIN can create entries for any subcontractor.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SubcontractorWorkEntity>> createWorkEntry(
            @RequestParam("siteId") Long siteId,
            @RequestParam(value = "subcontractorId", required = false) Long subcontractorId,
            @RequestParam("workDate") String workDate,
            @RequestParam("quantityExecuted") Double quantityExecuted,
            @RequestParam(value = "workOrderNumber", required = false) String workOrderNumber,
            @RequestParam(value = "workDescription", required = false) String workDescription,
            @RequestParam(value = "contractedQuantity", required = false) Double contractedQuantity,
            @RequestParam(value = "rate", required = false) Double rate,
            @RequestParam(value = "unit", required = false) String unit,
            @RequestParam(value = "materialName", required = false) String materialName,
            @RequestParam(value = "materialQuantity", required = false) Double materialQuantity,
            @RequestParam(value = "materialUnit", required = false) String materialUnit,
            @RequestParam(value = "paymentAmount", required = false) Double paymentAmount,
            @RequestParam(value = "paymentStatus", required = false) String paymentStatus,
            @RequestParam(value = "remarks", required = false) String remarks,
            @RequestParam(value = "photo", required = false) MultipartFile photo,
            Authentication auth) throws IOException {

        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Determine the subcontractor for this entry
        Long actualSubcontractorId;
        if (user.getRole() == UserEntity.Role.SUBCONTRACTOR) {
            // Subcontractor creates entry for themselves
            actualSubcontractorId = user.getId();
        } else if (user.getRole() == UserEntity.Role.SUBCONTRACTOR_ADMIN ||
                   user.getRole() == UserEntity.Role.OWNER ||
                   user.getRole() == UserEntity.Role.OFFICE_ADMIN) {
            // Admin can specify which subcontractor
            if (subcontractorId == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("subcontractorId is required for admin users"));
            }
            actualSubcontractorId = subcontractorId;
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: You cannot create work entries"));
        }

        UserEntity subcontractor = userRepository.findById(actualSubcontractorId).orElse(null);
        if (subcontractor == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Subcontractor not found"));
        }

        SubcontractorWorkEntity work = new SubcontractorWorkEntity();
        work.setSubcontractor(subcontractor);
        work.setSite(new com.siteledger.entity.SiteEntity());
        work.getSite().setId(siteId);
        work.setWorkDate(LocalDate.parse(workDate));
        work.setQuantityExecuted(java.math.BigDecimal.valueOf(quantityExecuted));
        work.setWorkOrderNumber(workOrderNumber);
        work.setWorkDescription(workDescription);
        if (contractedQuantity != null) {
            work.setContractedQuantity(java.math.BigDecimal.valueOf(contractedQuantity));
        }
        if (rate != null) {
            work.setRate(java.math.BigDecimal.valueOf(rate));
        }
        work.setUnit(unit);
        work.setMaterialName(materialName);
        if (materialQuantity != null) {
            work.setMaterialQuantity(java.math.BigDecimal.valueOf(materialQuantity));
        }
        work.setMaterialUnit(materialUnit);
        if (paymentAmount != null) {
            work.setPaymentAmount(java.math.BigDecimal.valueOf(paymentAmount));
        }
        work.setPaymentStatus(paymentStatus != null ? paymentStatus : "PENDING");
        work.setRemarks(remarks);
        work.setCreatedBy(username);
        work.setUser(user);

        // Handle photo upload
        if (photo != null && !photo.isEmpty()) {
            String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            Path siteDir = uploadDir.resolve("subcontractor_" + actualSubcontractorId).resolve(dateStr);
            Files.createDirectories(siteDir);

            String originalFileName = photo.getOriginalFilename();
            String extension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String storedFileName = UUID.randomUUID().toString() + extension;
            Path filePath = siteDir.resolve(storedFileName);
            Files.copy(photo.getInputStream(), filePath);

            work.setPhotoPath(filePath.toString());
            work.setPhotoFileName(originalFileName);
        }

        SubcontractorWorkEntity saved = workRepository.save(work);

        auditService.logCreate(username, user.getRole().name(), "SUBCONTRACTOR_WORK", saved.getId(), siteId);

        return ResponseEntity.ok(ApiResponse.success("Work entry created successfully", saved));
    }

    /**
     * Update payment status for a work entry (OWNER, OFFICE_ADMIN, SUBCONTRACTOR_ADMIN only).
     */
    @PutMapping("/{id}/payment")
    public ResponseEntity<ApiResponse<SubcontractorWorkEntity>> updatePaymentStatus(
            @PathVariable Long id,
            @RequestParam Double paymentAmount,
            @RequestParam String paymentStatus,
            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER, OFFICE_ADMIN, SUBCONTRACTOR_ADMIN can update payment
        if (user.getRole() != UserEntity.Role.OWNER &&
            user.getRole() != UserEntity.Role.OFFICE_ADMIN &&
            user.getRole() != UserEntity.Role.SUBCONTRACTOR_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: Cannot update payment status"));
        }

        var opt = workRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var work = opt.get();
        work.setPaymentAmount(java.math.BigDecimal.valueOf(paymentAmount));
        work.setPaymentStatus(paymentStatus);
        SubcontractorWorkEntity saved = workRepository.save(work);

        auditService.logUpdate(username, user.getRole().name(), "SUBCONTRACTOR_WORK", id,
                "paymentStatus", "old", paymentStatus,
                saved.getSite() != null ? saved.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Payment status updated", saved));
    }

    /**
     * Delete a work entry (OWNER, OFFICE_ADMIN, SUBCONTRACTOR_ADMIN only).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkEntry(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER, OFFICE_ADMIN, SUBCONTRACTOR_ADMIN can delete
        if (user.getRole() != UserEntity.Role.OWNER &&
            user.getRole() != UserEntity.Role.OFFICE_ADMIN &&
            user.getRole() != UserEntity.Role.SUBCONTRACTOR_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: Cannot delete work entries"));
        }

        var opt = workRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var work = opt.get();

        // Delete photo from disk if exists
        if (work.getPhotoPath() != null) {
            try {
                Path filePath = Paths.get(work.getPhotoPath());
                Files.deleteIfExists(filePath);
            } catch (IOException ignored) {}
        }

        Long siteId = work.getSite() != null ? work.getSite().getId() : null;
        workRepository.delete(work);

        auditService.logDelete(username, user.getRole().name(), "SUBCONTRACTOR_WORK", id, siteId);

        return ResponseEntity.ok(ApiResponse.success("Work entry deleted successfully", null));
    }
}
