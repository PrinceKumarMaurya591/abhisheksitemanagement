package com.siteledger.repository;

import com.siteledger.entity.LabourAttendanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LabourAttendanceRepository extends JpaRepository<LabourAttendanceEntity, Long> {

    List<LabourAttendanceEntity> findBySiteIdAndDateOrderByLabourRegistrationIdAsc(Long siteId, LocalDate date);

    Optional<LabourAttendanceEntity> findByLabourRegistrationIdAndDate(Long labourRegistrationId, LocalDate date);

    long countBySiteIdAndDateAndPresentTrue(Long siteId, LocalDate date);

    long countBySiteIdAndDateAndPresentFalse(Long siteId, LocalDate date);

    long countBySiteIdAndDate(Long siteId, LocalDate date);

    @Query("SELECT COUNT(DISTINCT la.labourRegistrationId) FROM LabourAttendanceEntity la " +
           "WHERE la.siteId = :siteId AND la.date BETWEEN :startDate AND :endDate AND la.present = true")
    long countDistinctPresentBySiteIdAndDateBetween(
            @Param("siteId") Long siteId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT la.labourRegistrationId, COUNT(la) FROM LabourAttendanceEntity la " +
           "WHERE la.siteId = :siteId AND la.date BETWEEN :startDate AND :endDate AND la.present = true " +
           "GROUP BY la.labourRegistrationId")
    List<Object[]> countPresentDaysBySiteIdAndDateBetween(
            @Param("siteId") Long siteId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    List<LabourAttendanceEntity> findByLabourRegistrationIdAndDateBetweenOrderByDateAsc(
            Long labourRegistrationId, LocalDate startDate, LocalDate endDate);
}
