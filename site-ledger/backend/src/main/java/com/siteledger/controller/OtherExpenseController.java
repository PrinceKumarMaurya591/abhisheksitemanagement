package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.*;
import com.siteledger.repository.OtherExpenseRepository;
import com.siteledger.repository.PermissionRepository;
import com.siteledger.repository.UserRepository;
import com.siteledger.service.TimeAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/other-expenses")
public class OtherExpenseController {

    private final OtherExpenseRepository otherExpenseRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final TimeAccessService timeAccessService;

    public OtherExpenseController(OtherExpenseRepository otherExpenseRepository,
                                  UserRepository userRepository,
                                  PermissionRepository permissionRepository,
                                  TimeAccessService timeAccessService) {
        this.otherExpenseRepository = otherExpenseRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.timeAccessService = timeAccessService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OtherExpenseEntity>>> getExpenses(
            @RequestParam(required = false) String level,
            @RequestParam(required = false) Long yojnaId,
            @RequestParam(required = false) Long siteId,
            @RequestParam(required = false) Long staffUserId,
            Authentication auth) {

        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        List<OtherExpenseEntity> expenses;

        if (level != null) {
            ExpenseCategoryEntity.ExpenseLevel expenseLevel =
                    ExpenseCategoryEntity.ExpenseLevel.valueOf(level.toUpperCase());

            expenses = switch (expenseLevel) {
                case YOJNA -> otherExpenseRepository
                        .findByExpenseLevelAndYojnaIdOrderByCreatedAtDesc(expenseLevel, yojnaId);
                case SITE -> otherExpenseRepository
                        .findByExpenseLevelAndSiteIdOrderByCreatedAtDesc(expenseLevel, siteId);
                case STAFF -> otherExpenseRepository
                        .findByExpenseLevelAndStaffUserIdOrderByCreatedAtDesc(expenseLevel, staffUserId);
            };
        } else {
            // No level filter - return everything user has access to
            if (user.getRole() == UserEntity.Role.OWNER || user.getRole() == UserEntity.Role.OFFICE_ADMIN) {
                expenses = otherExpenseRepository.findAll();
            } else {
                // For site staff, return only their own or their site's expenses
                expenses = otherExpenseRepository.findByStaffUserIdOrderByCreatedAtDesc(user.getId());
            }
        }

        // Apply time-based access filtering for non-owner/admin roles
        if (user.getRole() != UserEntity.Role.OWNER && user.getRole() != UserEntity.Role.OFFICE_ADMIN) {
            expenses = expenses.stream()
                    .filter(e -> timeAccessService.canViewEntry(user, e.getCreatedAt()))
                    .toList();
        }

        // For MUNSHI/MATE: only show entries they created themselves
        if (user.getRole() == UserEntity.Role.MUNSHI || user.getRole() == UserEntity.Role.MATE) {
            expenses = expenses.stream()
                    .filter(e -> e.getUser() != null && e.getUser().getId().equals(user.getId()))
                    .toList();
        }

        return ResponseEntity.ok(ApiResponse.success(expenses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OtherExpenseEntity>> getExpense(@PathVariable Long id,
                                                                       Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        return otherExpenseRepository.findById(id)
                .<ResponseEntity<ApiResponse<OtherExpenseEntity>>>map(expense -> {
                    // Check time-based access for non-admin roles
                    if (user.getRole() != UserEntity.Role.OWNER
                            && user.getRole() != UserEntity.Role.OFFICE_ADMIN
                            && !timeAccessService.canViewEntry(user, expense.getCreatedAt())) {
                        return ResponseEntity.<ApiResponse<OtherExpenseEntity>>badRequest()
                                .body(ApiResponse.error("Access denied: entry view window has expired"));
                    }
                    // MUNSHI/MATE can only view their own entries
                    if (user.getRole() == UserEntity.Role.MUNSHI || user.getRole() == UserEntity.Role.MATE) {
                        if (expense.getUser() == null || !expense.getUser().getId().equals(user.getId())) {
                            return ResponseEntity.<ApiResponse<OtherExpenseEntity>>badRequest()
                                    .body(ApiResponse.error("Access denied: you can only view your own entries"));
                        }
                    }
                    return ResponseEntity.ok(ApiResponse.success(expense));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OtherExpenseEntity>> createExpense(
            @RequestBody OtherExpenseEntity expense,
            Authentication auth) {

        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // OWNER, OFFICE_ADMIN, and SITE_INCHARGE can create other expenses
        // MUNSHI/MATE can also create at SITE level if assigned to that site
        if (user.getRole() == UserEntity.Role.OWNER
                || user.getRole() == UserEntity.Role.OFFICE_ADMIN
                || user.getRole() == UserEntity.Role.SITE_INCHARGE) {
            // These roles can proceed
        } else if (user.getRole() == UserEntity.Role.MUNSHI || user.getRole() == UserEntity.Role.MATE) {
            // Check ADD permission
            boolean canAdd = permissionRepository
                    .existsByUserIdAndModuleAndPermissionAndEnabledTrue(user.getId(), "EXPENSE", "ADD");
            if (!canAdd) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Access denied: No EXPENSE ADD permission"));
            }

            // MUNSHI/MATE can only create SITE-level expenses
            if (expense.getExpenseLevel() != ExpenseCategoryEntity.ExpenseLevel.SITE) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Access denied: you can only add site-level expenses"));
            }

            if (expense.getSite() == null || expense.getSite().getId() == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Site is required"));
            }

            // Validate site assignment
            String assignedSites = user.getAssignedSiteIds();
            if (assignedSites == null || assignedSites.isBlank()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("You are not assigned to any site"));
            }
            Set<String> assignedSiteSet = Arrays.stream(assignedSites.split(","))
                    .map(String::trim)
                    .collect(Collectors.toSet());
            if (!assignedSiteSet.contains(String.valueOf(expense.getSite().getId()))) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Access denied: you can only add expenses to your assigned site(s)"));
            }

            // Auto-set staffUser to the current user for MUNSHI/MATE
            expense.setStaffUser(user);
        } else {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("You don't have permission to create expenses"));
        }

        expense.setUser(user);
        return ResponseEntity.ok(ApiResponse.success("Expense created successfully",
                otherExpenseRepository.save(expense)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OtherExpenseEntity>> updateExpense(
            @PathVariable Long id,
            @RequestBody OtherExpenseEntity expenseUpdate,
            Authentication auth) {

        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        return otherExpenseRepository.findById(id)
                .<ResponseEntity<ApiResponse<OtherExpenseEntity>>>map(existing -> {
            // Check edit permission with time access
            if (!timeAccessService.canEditEntry(user, existing.getCreatedAt())) {
                return ResponseEntity.<ApiResponse<OtherExpenseEntity>>badRequest()
                        .body(ApiResponse.error("Access denied: cannot edit this entry"));
            }

            expenseUpdate.setId(id);
            expenseUpdate.setUser(existing.getUser());
            expenseUpdate.setCreatedAt(existing.getCreatedAt());
            return ResponseEntity.ok(ApiResponse.success("Expense updated successfully",
                    otherExpenseRepository.save(expenseUpdate)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExpense(@PathVariable Long id,
                                                            Authentication auth) {
        String username = auth.getName();
        UserEntity user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        // Only OWNER and OFFICE_ADMIN can delete
        if (!timeAccessService.canDeleteEntry(user)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("You don't have permission to delete expenses"));
        }

        otherExpenseRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Expense deleted successfully", null));
    }
}
