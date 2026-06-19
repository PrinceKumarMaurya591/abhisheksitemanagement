package com.siteledger.repository;

import com.siteledger.entity.LabourRegistrationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabourRegistrationRepository extends JpaRepository<LabourRegistrationEntity, Long> {
    List<LabourRegistrationEntity> findBySiteIdOrderByNameAsc(Long siteId);
    List<LabourRegistrationEntity> findBySiteIdAndStatusOrderByNameAsc(Long siteId, LabourRegistrationEntity.LabourStatus status);
    List<LabourRegistrationEntity> findBySiteIdAndCategoryOrderByNameAsc(Long siteId, String category);
    long countBySiteIdAndStatus(Long siteId, LabourRegistrationEntity.LabourStatus status);
    long countBySiteId(Long siteId);
}
