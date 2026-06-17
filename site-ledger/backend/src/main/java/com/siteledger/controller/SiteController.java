package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.SiteEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.repository.SiteRepository;
import com.siteledger.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sites")
public class SiteController {

    private final SiteRepository siteRepository;
    private final UserRepository userRepository;

    public SiteController(SiteRepository siteRepository, UserRepository userRepository) {
        this.siteRepository = siteRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SiteEntity>>> getAllSites(Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // OWNER and OFFICE_ADMIN see all sites (with yojna eagerly fetched for filtering)
        if (user.getRole() == UserEntity.Role.OWNER || user.getRole() == UserEntity.Role.OFFICE_ADMIN) {
            return ResponseEntity.ok(ApiResponse.success(siteRepository.findAllWithYojna()));
        }

        // SITE_STAFF and SUBCONTRACTOR see only assigned sites (with yojna eagerly fetched)
        if (user.getAssignedSiteIds() != null && !user.getAssignedSiteIds().isEmpty()) {
            List<Long> siteIds = parseSiteIds(user.getAssignedSiteIds());
            List<SiteEntity> assignedSites = siteRepository.findAllByIdWithYojna(siteIds);
            return ResponseEntity.ok(ApiResponse.success(assignedSites));
        }

        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SiteEntity>> getSite(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Check if user has access to this site
        if (!hasSiteAccess(user, id)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Access denied to this site"));
        }

        return siteRepository.findById(id)
                .map(site -> ResponseEntity.ok(ApiResponse.success(site)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<SiteEntity>> createSite(@RequestBody SiteEntity site) {
        return ResponseEntity.ok(ApiResponse.success("Site created successfully",
                siteRepository.save(site)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<SiteEntity>> updateSite(@PathVariable Long id,
                                                               @RequestBody SiteEntity site) {
        return siteRepository.findById(id).map(existing -> {
            // Preserve immutable fields
            site.setId(id);
            site.setCreatedAt(existing.getCreatedAt());
            site.setStatus(existing.getStatus());
            // Merge yojna if provided
            if (site.getYojna() != null && site.getYojna().getId() != null) {
                // Keep the provided yojna
            }
            return ResponseEntity.ok(ApiResponse.success("Site updated successfully",
                    siteRepository.save(site)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<SiteEntity>> updateSiteStatus(@PathVariable Long id,
                                                                     @RequestBody SiteEntity statusUpdate) {
        return siteRepository.findById(id).map(existing -> {
            existing.setStatus(statusUpdate.getStatus());
            return ResponseEntity.ok(ApiResponse.success("Site status updated to " + statusUpdate.getStatus(),
                    siteRepository.save(existing)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Archive (soft-delete) a site instead of hard-deleting it */
    @PutMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<SiteEntity>> archiveSite(@PathVariable Long id) {
        return siteRepository.findById(id).map(existing -> {
            existing.setStatus(SiteEntity.SiteStatus.ARCHIVED);
            return ResponseEntity.ok(ApiResponse.success("Site archived successfully",
                    siteRepository.save(existing)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Restore an archived site back to ACTIVE */
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<SiteEntity>> restoreSite(@PathVariable Long id) {
        return siteRepository.findById(id).map(existing -> {
            existing.setStatus(SiteEntity.SiteStatus.ACTIVE);
            return ResponseEntity.ok(ApiResponse.success("Site restored successfully",
                    siteRepository.save(existing)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/archived")
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<List<SiteEntity>>> getArchivedSites() {
        List<SiteEntity> archivedSites = siteRepository.findByStatus(SiteEntity.SiteStatus.ARCHIVED);
        return ResponseEntity.ok(ApiResponse.success(archivedSites));
    }

    /** Assign staff to a site */
    @PostMapping("/{siteId}/assign")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<SiteEntity>> assignStaff(@PathVariable Long siteId,
                                                                @RequestBody List<Long> userIds) {
        return siteRepository.findById(siteId).map(site -> {
            List<UserEntity> staff = userRepository.findAllById(userIds);
            site.getAssignedStaff().addAll(staff);
            // Also update assignedSiteIds on each user
            for (UserEntity u : staff) {
                String existing = u.getAssignedSiteIds();
                String siteIdStr = String.valueOf(siteId);
                if (existing == null || existing.isEmpty()) {
                    u.setAssignedSiteIds(siteIdStr);
                } else if (!existing.contains(siteIdStr)) {
                    u.setAssignedSiteIds(existing + "," + siteIdStr);
                }
                userRepository.save(u);
            }
            return ResponseEntity.ok(ApiResponse.success("Staff assigned", siteRepository.save(site)));
        }).orElse(ResponseEntity.notFound().build());
    }

    private boolean hasSiteAccess(UserEntity user, Long siteId) {
        if (user.getRole() == UserEntity.Role.OWNER || user.getRole() == UserEntity.Role.OFFICE_ADMIN) {
            return true;
        }
        if (user.getAssignedSiteIds() != null) {
            List<Long> siteIds = parseSiteIds(user.getAssignedSiteIds());
            return siteIds.contains(siteId);
        }
        return false;
    }

    private List<Long> parseSiteIds(String assignedSiteIds) {
        return java.util.Arrays.stream(assignedSiteIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }
}
