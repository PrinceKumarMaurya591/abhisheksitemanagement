package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.SiteEntity;
import com.siteledger.entity.UserEntity;
import com.siteledger.entity.YojnaEntity;
import com.siteledger.repository.SiteRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.repository.YojnaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/yojnas")
public class YojnaController {

    private final YojnaRepository yojnaRepository;
    private final SiteRepository siteRepository;
    private final UserRepository userRepository;

    public YojnaController(YojnaRepository yojnaRepository,
                           SiteRepository siteRepository,
                           UserRepository userRepository) {
        this.yojnaRepository = yojnaRepository;
        this.siteRepository = siteRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<YojnaEntity>>> getAllYojnas(Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // OWNER and OFFICE_ADMIN see all Yojnas
        // Other roles see Yojnas that have sites they are assigned to
        if (user.getRole() == UserEntity.Role.OWNER || user.getRole() == UserEntity.Role.OFFICE_ADMIN) {
            return ResponseEntity.ok(ApiResponse.success(yojnaRepository.findAll()));
        }

        // For site staff, find yojnas through their assigned sites
        if (user.getAssignedSiteIds() != null && !user.getAssignedSiteIds().isEmpty()) {
            List<Long> siteIds = parseSiteIds(user.getAssignedSiteIds());
            List<SiteEntity> assignedSites = siteRepository.findAllById(siteIds);
            List<YojnaEntity> yojnas = assignedSites.stream()
                    .map(SiteEntity::getYojna)
                    .distinct()
                    .filter(y -> y != null && y.getStatus() == YojnaEntity.YojnaStatus.ACTIVE)
                    .toList();
            return ResponseEntity.ok(ApiResponse.success(yojnas));
        }

        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<YojnaEntity>> getYojna(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        return yojnaRepository.findById(id)
                .map(yojna -> ResponseEntity.ok(ApiResponse.success(yojna)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/sites")
    public ResponseEntity<ApiResponse<List<SiteEntity>>> getYojnaSites(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        return yojnaRepository.findById(id).map(yojna -> {
            List<SiteEntity> sites;

            if (user.getRole() == UserEntity.Role.OWNER || user.getRole() == UserEntity.Role.OFFICE_ADMIN) {
                // OWNER and OFFICE_ADMIN see all sites in this Yojna
                sites = siteRepository.findByYojnaId(id);
            } else {
                // Other roles see only assigned sites within this Yojna
                if (user.getAssignedSiteIds() != null && !user.getAssignedSiteIds().isEmpty()) {
                    List<Long> assignedSiteIds = parseSiteIds(user.getAssignedSiteIds());
                    List<SiteEntity> allYojnaSites = siteRepository.findByYojnaId(id);
                    sites = allYojnaSites.stream()
                            .filter(site -> assignedSiteIds.contains(site.getId()))
                            .toList();
                } else {
                    sites = List.of();
                }
            }

            return ResponseEntity.ok(ApiResponse.success(sites));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<YojnaEntity>> createYojna(@RequestBody YojnaEntity yojna) {
        yojna.setStatus(YojnaEntity.YojnaStatus.ACTIVE);
        return ResponseEntity.ok(ApiResponse.success("Yojna created successfully",
                yojnaRepository.save(yojna)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<YojnaEntity>> updateYojna(@PathVariable Long id,
                                                                 @RequestBody YojnaEntity yojna) {
        return yojnaRepository.findById(id).map(existing -> {
            yojna.setId(id);
            yojna.setCreatedAt(existing.getCreatedAt());
            return ResponseEntity.ok(ApiResponse.success("Yojna updated successfully",
                    yojnaRepository.save(yojna)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Void>> deleteYojna(@PathVariable Long id) {
        if (!yojnaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        yojnaRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Yojna deleted successfully", null));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<YojnaEntity>> updateYojnaStatus(@PathVariable Long id,
                                                                       @RequestBody YojnaEntity statusUpdate) {
        return yojnaRepository.findById(id).map(existing -> {
            existing.setStatus(statusUpdate.getStatus());
            return ResponseEntity.ok(ApiResponse.success("Yojna status updated to " + statusUpdate.getStatus(),
                    yojnaRepository.save(existing)));
        }).orElse(ResponseEntity.notFound().build());
    }

    private List<Long> parseSiteIds(String assignedSiteIds) {
        return java.util.Arrays.stream(assignedSiteIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(java.util.stream.Collectors.toList());
    }
}
