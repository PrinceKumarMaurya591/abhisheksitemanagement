package com.siteledger.repository;

import com.siteledger.entity.ExpenseCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategoryEntity, Long> {
    List<ExpenseCategoryEntity> findByIsActiveTrue();
    List<ExpenseCategoryEntity> findByCategoryNameContainingIgnoreCase(String name);
}
