package com.siteledger.repository;

import com.siteledger.entity.MaterialTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaterialTransactionRepository extends JpaRepository<MaterialTransactionEntity, Long> {
    List<MaterialTransactionEntity> findByMaterialIdOrderByTransactionDateDesc(Long materialId);
    List<MaterialTransactionEntity> findBySiteIdOrderByTransactionDateDesc(Long siteId);
    List<MaterialTransactionEntity> findByTransactionTypeOrderByTransactionDateDesc(
            MaterialTransactionEntity.TransactionType transactionType);
}
