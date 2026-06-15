package com.siteledger.repository;

import com.siteledger.entity.ExpenseCategoryEntity;
import com.siteledger.entity.OtherExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OtherExpenseRepository extends JpaRepository<OtherExpenseEntity, Long> {
    List<OtherExpenseEntity> findByYojnaIdOrderByCreatedAtDesc(Long yojnaId);
    List<OtherExpenseEntity> findBySiteIdOrderByCreatedAtDesc(Long siteId);
    List<OtherExpenseEntity> findByStaffUserIdOrderByCreatedAtDesc(Long staffUserId);
    List<OtherExpenseEntity> findByExpenseLevelAndYojnaIdOrderByCreatedAtDesc(
            ExpenseCategoryEntity.ExpenseLevel expenseLevel, Long yojnaId);
    List<OtherExpenseEntity> findByExpenseLevelAndSiteIdOrderByCreatedAtDesc(
            ExpenseCategoryEntity.ExpenseLevel expenseLevel, Long siteId);
    List<OtherExpenseEntity> findByExpenseLevelAndStaffUserIdOrderByCreatedAtDesc(
            ExpenseCategoryEntity.ExpenseLevel expenseLevel, Long staffUserId);
}
