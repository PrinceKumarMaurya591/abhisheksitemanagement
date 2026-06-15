package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.DocumentEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.DocumentRepository;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.AuditService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
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
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;
    private final com.siteledger.repository.SiteRepository siteRepository;
    private final Path uploadDir;

    public DocumentController(DocumentRepository documentRepository,
                              UserRepository userRepository,
                              PermissionRepository permissionRepository,
                              AuditService auditService,
                              com.siteledger.repository.SiteRepository siteRepository,
                              @Value("${app.upload.dir}") String uploadDirPath) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
        this.siteRepository = siteRepository;
        this.uploadDir = Paths.get(uploadDirPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + this.uploadDir, e);
        }
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<DocumentEntity>>> getSiteDocuments(@PathVariable Long siteId,
                                                                               Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check DOCUMENT VIEW permission for non-OWNER/OFFICE_ADMIN
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canView = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "DOCUMENT", "VIEW");
            if (!canView) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No DOCUMENT VIEW permission"));
            }
        }

        return ResponseEntity.ok(ApiResponse.success(documentRepository.findBySiteIdOrderByCreatedAtDesc(siteId)));
    }

    @GetMapping("/search/{documentType}")
    public ResponseEntity<ApiResponse<List<DocumentEntity>>> searchByType(@PathVariable String documentType) {
        try {
            DocumentEntity.DocumentType docType = DocumentEntity.DocumentType.valueOf(documentType.toUpperCase());
            return ResponseEntity.ok(ApiResponse.success(documentRepository.findByDocumentTypeOrderByCreatedAtDesc(docType)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid document type: " + documentType));
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentEntity>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") String documentType,
            @RequestParam("siteId") Long siteId,
            @RequestParam(value = "version", required = false) String version,
            @RequestParam(value = "description", required = false) String description,
            Authentication auth) throws IOException {

        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check DOCUMENT ADD permission for non-OWNER/OFFICE_ADMIN
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            boolean canAdd = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "DOCUMENT", "ADD");
            if (!canAdd) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Access denied: No DOCUMENT ADD permission"));
            }
        }

        // Create date-based subdirectory
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        Path siteDir = uploadDir.resolve("site_" + siteId).resolve(dateStr);
        Files.createDirectories(siteDir);

        // Generate unique filename
        String originalFileName = file.getOriginalFilename();
        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String storedFileName = UUID.randomUUID().toString() + extension;
        Path filePath = siteDir.resolve(storedFileName);
        Files.copy(file.getInputStream(), filePath);

        // Save document metadata
        DocumentEntity doc = new DocumentEntity();
        doc.setFileName(originalFileName);
        doc.setFilePath(filePath.toString());
        doc.setFileSize(file.getSize());
        doc.setContentType(file.getContentType());
        doc.setDocumentType(DocumentEntity.DocumentType.valueOf(documentType.toUpperCase()));
        doc.setVersion(version);
        doc.setDescription(description);
        doc.setUploadedBy(username);
        doc.setUser(user);
        doc.setSite(siteRepository.findById(siteId).orElse(null));

        DocumentEntity saved = documentRepository.save(doc);

        auditService.logCreate(username, user.getRole().name(), "DOCUMENT", saved.getId(), siteId);

        return ResponseEntity.ok(ApiResponse.success("Document uploaded successfully", saved));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<?> downloadDocument(@PathVariable Long id) {
        var opt = documentRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var doc = opt.get();
        try {
            Path filePath = Paths.get(doc.getFilePath());
            Resource resource = new FileSystemResource(filePath);
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(doc.getContentType() != null ? doc.getContentType() : "application/octet-stream"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFileName() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        var opt = documentRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var doc = opt.get();

        // Delete file from disk
        try {
            Path filePath = Paths.get(doc.getFilePath());
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}

        documentRepository.delete(doc);

        auditService.logDelete(username, user.getRole().name(), "DOCUMENT", id,
                doc.getSite() != null ? doc.getSite().getId() : null);

        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
    }
}
