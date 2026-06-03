package com.siteledger.repository;

import com.siteledger.entity.SubcontractorWorkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubcontractorWorkRepository extends JpaRepository<SubcontractorWorkEntity, Long> {

    List<SubcontractorWorkEntity> findBySubcontractorIdOrderByWorkDateDesc(Long subcontractorId);

    List<SubcontractorWorkEntity> findBySiteIdOrderByWorkDateDesc(Long siteId);

    List<SubcontractorWorkEntity> findBySubcontractorIdAndSiteIdOrderByWorkDateDesc(Long subcontractorId, Long siteId);

    List<SubcontractorWorkEntity> findBySiteIdAndSubcontractorIdOrderByWorkDateDesc(Long siteId, Long subcontractorId);
}
