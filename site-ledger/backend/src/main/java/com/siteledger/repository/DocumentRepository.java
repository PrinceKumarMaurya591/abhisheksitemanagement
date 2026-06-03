package com.siteledger.repository;

import com.siteledger.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {
    List<DocumentEntity> findBySiteIdOrderByCreatedAtDesc(Long siteId);
    List<DocumentEntity> findByDocumentTypeOrderByCreatedAtDesc(DocumentEntity.DocumentType documentType);
    List<DocumentEntity> findBySiteIdAndDocumentTypeOrderByCreatedAtDesc(Long siteId, DocumentEntity.DocumentType documentType);
}
