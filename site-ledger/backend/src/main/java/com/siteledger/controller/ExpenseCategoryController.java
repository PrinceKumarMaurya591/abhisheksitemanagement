package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.entity.ExpenseCategoryEntity;
import com.siteledger.repository.ExpenseCategoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expense-categories")
public class ExpenseCategoryController {

    private final ExpenseCategoryRepository expenseCategoryRepository;

    public ExpenseCategoryController(ExpenseCategoryRepository expenseCategoryRepository) {
        this.expenseCategoryRepository = expenseCategoryRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExpenseCategoryEntity>>> getAllCategories(
            @RequestParam(required = false) Boolean activeOnly) {
        List<ExpenseCategoryEntity> categories;
        if (Boolean.TRUE.equals(activeOnly)) {
            categories = expenseCategoryRepository.findByIsActiveTrue();
        } else {
            categories = expenseCategoryRepository.findAll();
        }
        return ResponseEntity.ok(ApiResponse.success(categories));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExpenseCategoryEntity>> getCategory(@PathVariable Long id) {
        return expenseCategoryRepository.findById(id)
                .map(category -> ResponseEntity.ok(ApiResponse.success(category)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<ExpenseCategoryEntity>> createCategory(
            @RequestBody ExpenseCategoryEntity category) {
        category.setIsActive(true);
        return ResponseEntity.ok(ApiResponse.success("Category created successfully",
                expenseCategoryRepository.save(category)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'OFFICE_ADMIN')")
    public ResponseEntity<ApiResponse<ExpenseCategoryEntity>> updateCategory(
            @PathVariable Long id, @RequestBody ExpenseCategoryEntity category) {
        return expenseCategoryRepository.findById(id).map(existing -> {
            category.setId(id);
            category.setCreatedAt(existing.getCreatedAt());
            return ResponseEntity.ok(ApiResponse.success("Category updated successfully",
                    expenseCategoryRepository.save(category)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        if (!expenseCategoryRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        expenseCategoryRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Category deleted successfully", null));
    }
}
