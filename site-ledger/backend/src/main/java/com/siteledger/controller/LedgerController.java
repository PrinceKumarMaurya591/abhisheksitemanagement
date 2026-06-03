package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.LedgerEntryEntity;
import com.siteledger.repository.LedgerEntryRepository;
import com.siteledger.repository.SiteRepository;
import com.siteledger.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ledger")
public class LedgerController {

    private final LedgerEntryRepository ledgerEntryRepository;
    private final SiteRepository siteRepository;
    private final UserRepository userRepository;

    public LedgerController(LedgerEntryRepository ledgerEntryRepository,
                            SiteRepository siteRepository,
                            UserRepository userRepository) {
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.siteRepository = siteRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<LedgerEntryEntity>>> getSiteLedger(@PathVariable Long siteId) {
        return ResponseEntity.ok(ApiResponse.success(
                ledgerEntryRepository.findBySiteIdOrderByEntryDateDesc(siteId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LedgerEntryEntity>> createEntry(
            @RequestBody LedgerEntryEntity entry,
            Authentication auth) {
        var site = siteRepository.findById(entry.getSite().getId())
                .orElseThrow(() -> new RuntimeException("Site not found"));
        var user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        entry.setSite(site);
        entry.setUser(user);
        return ResponseEntity.ok(ApiResponse.success("Entry created successfully",
                ledgerEntryRepository.save(entry)));
    }

    @GetMapping("/site/{siteId}/category/{category}")
    public ResponseEntity<ApiResponse<List<LedgerEntryEntity>>> getByCategory(
            @PathVariable Long siteId,
            @PathVariable LedgerEntryEntity.Category category) {
        return ResponseEntity.ok(ApiResponse.success(
                ledgerEntryRepository.findBySiteIdAndCategoryOrderByEntryDateDesc(siteId, category)));
    }
}
