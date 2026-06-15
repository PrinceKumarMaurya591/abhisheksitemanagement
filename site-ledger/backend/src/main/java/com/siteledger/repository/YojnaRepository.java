package com.siteledger.repository;

import com.siteledger.entity.YojnaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface YojnaRepository extends JpaRepository<YojnaEntity, Long> {
    List<YojnaEntity> findByStatus(YojnaEntity.YojnaStatus status);
    List<YojnaEntity> findByYojnaNameContainingIgnoreCase(String name);
}
