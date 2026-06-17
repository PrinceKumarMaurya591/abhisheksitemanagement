package com.siteledger.service;

import com.siteledger.dto.DashboardResponse;
import com.siteledger.entity.LedgerEntryEntity;
import com.siteledger.entity.SiteEntity;
import com.siteledger.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final SiteRepository siteRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final MaterialRepository materialRepository;
    private final LabourRepository labourRepository;
    private final AdvanceRepository advanceRepository;
    private final PaymentRepository paymentRepository;

    public DashboardService(SiteRepository siteRepository,
                            LedgerEntryRepository ledgerEntryRepository,
                            MaterialRepository materialRepository,
                            LabourRepository labourRepository,
                            AdvanceRepository advanceRepository,
                            PaymentRepository paymentRepository) {
        this.siteRepository = siteRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.materialRepository = materialRepository;
        this.labourRepository = labourRepository;
        this.advanceRepository = advanceRepository;
        this.paymentRepository = paymentRepository;
    }

    public DashboardResponse getOwnerDashboard() {
        long totalSites = siteRepository.count();
        long runningSites = siteRepository.countByStatus(SiteEntity.SiteStatus.ACTIVE);
        long completedSites = siteRepository.countByStatus(SiteEntity.SiteStatus.COMPLETED);

        // Exclude CANCELLED and ARCHIVED sites from financial calculations
        List<SiteEntity> activeSites = siteRepository.findAll().stream()
                .filter(s -> s.getStatus() != SiteEntity.SiteStatus.CANCELLED
                        && s.getStatus() != SiteEntity.SiteStatus.ARCHIVED)
                .toList();

        BigDecimal totalContractValue = activeSites.stream()
                .map(s -> s.getContractValue() != null ? s.getContractValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Get all site IDs that are active (not cancelled/archived) for ledger calculations
        List<Long> activeSiteIds = activeSites.stream()
                .map(SiteEntity::getId)
                .toList();

        BigDecimal totalReceived = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        if (!activeSiteIds.isEmpty()) {
            totalReceived = ledgerEntryRepository.totalCreditBySites(activeSiteIds);
            totalExpense = ledgerEntryRepository.totalDebitBySites(activeSiteIds);
        }
        BigDecimal totalPending = totalContractValue.subtract(totalReceived);

        BigDecimal totalMaterialCost = BigDecimal.ZERO;
        BigDecimal totalLabourCost = BigDecimal.ZERO;
        if (!activeSiteIds.isEmpty()) {
            totalMaterialCost = ledgerEntryRepository.totalExpenseBySitesAndCategory(
                    activeSiteIds, LedgerEntryEntity.Category.MATERIAL);
            totalLabourCost = ledgerEntryRepository.totalExpenseBySitesAndCategory(
                    activeSiteIds, LedgerEntryEntity.Category.LABOUR);
        }

        BigDecimal outstandingAdvances = advanceRepository.totalOutstandingAdvances();

        BigDecimal overallProfitLoss = totalReceived.subtract(totalExpense);

        return DashboardResponse.builder()
                .totalSites(totalSites)
                .runningSites(runningSites)
                .completedSites(completedSites)
                .totalContractValue(totalContractValue)
                .totalReceived(totalReceived)
                .totalPending(totalPending.max(BigDecimal.ZERO))
                .totalExpense(totalExpense)
                .totalMaterialCost(totalMaterialCost)
                .totalLabourCost(totalLabourCost)
                .outstandingAdvances(outstandingAdvances)
                .overallProfitLoss(overallProfitLoss)
                .build();
    }

    public DashboardResponse.SiteDashboard getSiteDashboard(Long siteId) {
        SiteEntity site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("Site not found"));

        BigDecimal contractValue = site.getContractValue() != null ? site.getContractValue() : BigDecimal.ZERO;
        BigDecimal totalReceived = ledgerEntryRepository.totalCreditBySite(siteId);
        BigDecimal totalExpense = ledgerEntryRepository.totalDebitBySite(siteId);
        BigDecimal pendingAmount = contractValue.subtract(totalReceived).max(BigDecimal.ZERO);
        BigDecimal profitLoss = totalReceived.subtract(totalExpense);

        // Expense Summary by category
        Map<String, BigDecimal> expenseSummary = new HashMap<>();
        for (LedgerEntryEntity.Category cat : LedgerEntryEntity.Category.values()) {
            BigDecimal amount = ledgerEntryRepository.totalExpenseBySiteAndCategory(siteId, cat);
            expenseSummary.put(cat.name(), amount);
        }

        // Material Summary
        var materials = materialRepository.findBySiteId(siteId);
        BigDecimal purchased = BigDecimal.ZERO;
        BigDecimal shifted = BigDecimal.ZERO;
        BigDecimal consumed = BigDecimal.ZERO;
        BigDecimal balance = BigDecimal.ZERO;

        for (var mat : materials) {
            purchased = purchased.add(mat.getPurchasedQty() != null ? mat.getPurchasedQty() : BigDecimal.ZERO);
            shifted = shifted.add(mat.getShiftedQty() != null ? mat.getShiftedQty() : BigDecimal.ZERO);
            consumed = consumed.add(mat.getConsumedQty() != null ? mat.getConsumedQty() : BigDecimal.ZERO);
            balance = balance.add(mat.getBalanceQty() != null ? mat.getBalanceQty() : BigDecimal.ZERO);
        }

        DashboardResponse.MaterialSummary materialSummary = DashboardResponse.MaterialSummary.builder()
                .purchased(purchased)
                .shifted(shifted)
                .consumed(consumed)
                .balance(balance)
                .build();

        return DashboardResponse.SiteDashboard.builder()
                .contractValue(contractValue)
                .totalReceived(totalReceived)
                .pendingAmount(pendingAmount)
                .totalExpense(totalExpense)
                .profitLoss(profitLoss)
                .expenseSummary(expenseSummary)
                .materialSummary(materialSummary)
                .build();
    }
}
