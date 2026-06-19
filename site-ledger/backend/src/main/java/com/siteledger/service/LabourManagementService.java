package com.siteledger.service;

import com.siteledger.entity.*;
import com.siteledger.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/**
 * Service for the new Labour Module (Final Freeze).
 * Handles registration, attendance, wage calculation, payment, and dashboard.
 */
@Service
public class LabourManagementService {

    private final LabourRegistrationRepository registrationRepository;
    private final LabourAttendanceRepository attendanceRepository;
    private final LabourPaymentRepository paymentRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final SiteRepository siteRepository;
    private final AuditService auditService;

    public LabourManagementService(LabourRegistrationRepository registrationRepository,
                                    LabourAttendanceRepository attendanceRepository,
                                    LabourPaymentRepository paymentRepository,
                                    LedgerEntryRepository ledgerEntryRepository,
                                    SiteRepository siteRepository,
                                    AuditService auditService) {
        this.registrationRepository = registrationRepository;
        this.attendanceRepository = attendanceRepository;
        this.paymentRepository = paymentRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.siteRepository = siteRepository;
        this.auditService = auditService;
    }

    // ==================== REGISTRATION ====================

    public List<LabourRegistrationEntity> getRegisteredLabourers(Long siteId, boolean includeInactive) {
        if (includeInactive) {
            return registrationRepository.findBySiteIdOrderByNameAsc(siteId);
        }
        return registrationRepository.findBySiteIdAndStatusOrderByNameAsc(siteId, LabourRegistrationEntity.LabourStatus.ACTIVE);
    }

    public LabourRegistrationEntity registerLabourer(LabourRegistrationEntity registration, String username) {
        registration.setCreatedBy(username);
        return registrationRepository.save(registration);
    }

    public LabourRegistrationEntity updateLabourer(Long id, LabourRegistrationEntity update) {
        return registrationRepository.findById(id).map(existing -> {
            if (update.getPhotoPath() != null) existing.setPhotoPath(update.getPhotoPath());
            if (update.getName() != null) existing.setName(update.getName());
            if (update.getFatherName() != null) existing.setFatherName(update.getFatherName());
            if (update.getMobile() != null) existing.setMobile(update.getMobile());
            if (update.getCategory() != null) existing.setCategory(update.getCategory());
            if (update.getRatePerDay() != null) existing.setRatePerDay(update.getRatePerDay());
            if (update.getStatus() != null) existing.setStatus(update.getStatus());
            return registrationRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Labourer not found with id: " + id));
    }

    // ==================== ATTENDANCE ====================

    @Transactional
    public void markAttendance(Long siteId, Long labourRegistrationId, LocalDate date, boolean present, String username) {
        var existing = attendanceRepository.findByLabourRegistrationIdAndDate(labourRegistrationId, date);
        if (existing.isPresent()) {
            // Update existing attendance
            LabourAttendanceEntity att = existing.get();
            att.setPresent(present);
            attendanceRepository.save(att);
        } else {
            // Create new attendance
            LabourAttendanceEntity att = new LabourAttendanceEntity();
            att.setLabourRegistrationId(labourRegistrationId);
            att.setSiteId(siteId);
            att.setDate(date);
            att.setPresent(present);
            att.setMarkedBy(username);
            attendanceRepository.save(att);
        }
    }

    @Transactional
    public void markBulkAttendance(Long siteId, LocalDate date, List<AttendanceRecord> records, String username) {
        for (AttendanceRecord record : records) {
            markAttendance(siteId, record.labourRegistrationId, date, record.present, username);
        }
    }

    public List<LabourAttendanceEntity> getAttendanceForDate(Long siteId, LocalDate date) {
        return attendanceRepository.findBySiteIdAndDateOrderByLabourRegistrationIdAsc(siteId, date);
    }

    public Map<String, Object> getAttendanceSummary(Long siteId, LocalDate date) {
        long total = attendanceRepository.countBySiteIdAndDate(siteId, date);
        long present = attendanceRepository.countBySiteIdAndDateAndPresentTrue(siteId, date);
        long absent = attendanceRepository.countBySiteIdAndDateAndPresentFalse(siteId, date);
        Map<String, Object> summary = new HashMap<>();
        summary.put("total", total);
        summary.put("present", present);
        summary.put("absent", absent);
        return summary;
    }

    // ==================== WAGE CALCULATION ====================

    /**
     * Calculate wages for all active labourers at a site for a given month.
     * Returns a list of wage records with present days, rate, gross wage.
     */
    public List<WageRecord> calculateMonthlyWages(Long siteId, YearMonth month) {
        LocalDate startDate = month.atDay(1);
        LocalDate endDate = month.atEndOfMonth();

        List<LabourRegistrationEntity> labourers = registrationRepository
                .findBySiteIdOrderByNameAsc(siteId);
        List<WageRecord> wageRecords = new ArrayList<>();

        // Get present day counts for all labourers
        List<Object[]> presentDayCounts = attendanceRepository
                .countPresentDaysBySiteIdAndDateBetween(siteId, startDate, endDate);

        // Build lookup map: labourRegistrationId -> presentDays
        Map<Long, Long> presentDayMap = new HashMap<>();
        for (Object[] row : presentDayCounts) {
            Long labourId = (Long) row[0];
            Long count = (Long) row[1];
            presentDayMap.put(labourId, count);
        }

        for (LabourRegistrationEntity labourer : labourers) {
            long presentDays = presentDayMap.getOrDefault(labourer.getId(), 0L);
            BigDecimal grossWage = labourer.getRatePerDay()
                    .multiply(BigDecimal.valueOf(presentDays))
                    .setScale(2, RoundingMode.HALF_UP);

            WageRecord record = new WageRecord();
            record.labourRegistrationId = labourer.getId();
            record.name = labourer.getName();
            record.category = labourer.getCategory();
            record.ratePerDay = labourer.getRatePerDay();
            record.presentDays = presentDays;
            record.grossWage = grossWage;
            wageRecords.add(record);
        }

        return wageRecords;
    }

    // ==================== PAYMENT ====================

    @Transactional
    public LabourPaymentEntity processPayment(LabourPaymentEntity payment, String username) {
        // Calculate net payable
        BigDecimal advanceDeduction = payment.getAdvanceDeduction() != null ? payment.getAdvanceDeduction() : BigDecimal.ZERO;
        BigDecimal netPayable = payment.getGrossWage().subtract(advanceDeduction);
        if (netPayable.compareTo(BigDecimal.ZERO) < 0) {
            netPayable = BigDecimal.ZERO;
        }
        payment.setNetPayable(netPayable);
        payment.setCreatedBy(username);

        LabourPaymentEntity saved = paymentRepository.save(payment);

        // Sync to site ledger if not already synced
        if (!saved.isSyncedToLedger() && saved.getPaidAmount() != null
                && saved.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            syncToSiteLedger(saved, username);
        }

        return saved;
    }

    private void syncToSiteLedger(LabourPaymentEntity payment, String username) {
        SiteEntity site = siteRepository.findById(payment.getSiteId()).orElse(null);
        if (site == null) return;

        LedgerEntryEntity ledgerEntry = new LedgerEntryEntity();
        ledgerEntry.setEntryDate(payment.getPaymentDate() != null ? payment.getPaymentDate() : LocalDate.now());
        ledgerEntry.setParticulars("Labour Payment - " + payment.getPayPeriod()
                + " (Labour ID: " + payment.getLabourRegistrationId() + ")");
        ledgerEntry.setCategory(LedgerEntryEntity.Category.LABOUR);
        ledgerEntry.setAmount(payment.getPaidAmount());
        ledgerEntry.setEntryType(LedgerEntryEntity.EntryType.DEBIT);
        ledgerEntry.setSite(site);
        ledgerEntryRepository.save(ledgerEntry);

        // Mark as synced
        payment.setSyncedToLedger(true);
        paymentRepository.save(payment);
    }

    public List<LabourPaymentEntity> getPaymentsBySite(Long siteId) {
        return paymentRepository.findBySiteIdOrderByPaymentDateDesc(siteId);
    }

    public List<LabourPaymentEntity> getPaymentsByLabourer(Long labourRegistrationId) {
        return paymentRepository.findByLabourRegistrationIdOrderByPaymentDateDesc(labourRegistrationId);
    }

    // ==================== DASHBOARD ====================

    public Map<String, Object> getLabourDashboard(Long siteId) {
        long totalLabourers = registrationRepository.countBySiteId(siteId);
        long activeLabourers = registrationRepository.countBySiteIdAndStatus(siteId, LabourRegistrationEntity.LabourStatus.ACTIVE);

        LocalDate today = LocalDate.now();
        long presentToday = attendanceRepository.countBySiteIdAndDateAndPresentTrue(siteId, today);
        long absentToday = attendanceRepository.countBySiteIdAndDateAndPresentFalse(siteId, today);

        // Current month cost
        YearMonth currentMonth = YearMonth.now();
        BigDecimal currentMonthCost = paymentRepository.totalPaidBySiteAndPeriod(siteId, currentMonth.toString());

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalLabourers", totalLabourers);
        dashboard.put("activeLabourers", activeLabourers);
        dashboard.put("presentToday", presentToday);
        dashboard.put("absentToday", absentToday);
        dashboard.put("currentMonthCost", currentMonthCost != null ? currentMonthCost : BigDecimal.ZERO);
        dashboard.put("date", today.toString());

        return dashboard;
    }

    // ==================== INNER CLASSES ====================

    public static class AttendanceRecord {
        public Long labourRegistrationId;
        public boolean present;
    }

    public static class WageRecord {
        public Long labourRegistrationId;
        public String name;
        public String category;
        public BigDecimal ratePerDay;
        public long presentDays;
        public BigDecimal grossWage;
    }
}
