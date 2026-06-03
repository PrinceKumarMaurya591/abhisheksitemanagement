package com.siteledger.repository;

import com.siteledger.entity.MaterialEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaterialRepository extends JpaRepository<MaterialEntity, Long> {
    List<MaterialEntity> findBySiteId(Long siteId);
    List<MaterialEntity> findBySiteIdOrderByMaterialName(Long siteId);
}
