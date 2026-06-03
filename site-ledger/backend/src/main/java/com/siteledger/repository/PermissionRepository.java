package com.siteledger.repository;

import com.siteledger.entity.PermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<PermissionEntity, Long> {

    List<PermissionEntity> findByUserId(Long userId);

    Optional<PermissionEntity> findByUserIdAndModuleAndPermission(Long userId, String module, String permission);

    List<PermissionEntity> findByUserIdAndModule(Long userId, String module);

    boolean existsByUserIdAndModuleAndPermissionAndEnabledTrue(Long userId, String module, String permission);
}
