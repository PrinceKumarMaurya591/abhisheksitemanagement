package com.siteledger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    // Owner Dashboard
    private long totalSites;
    private long runningSites;
    private long completedSites;
    private BigDecimal totalContractValue;
    private BigDecimal totalReceived;
    private BigDecimal totalPending;
    private BigDecimal totalExpense;
    private BigDecimal totalMaterialCost;
    private BigDecimal totalLabourCost;
    private BigDecimal outstandingAdvances;
    private BigDecimal overallProfitLoss;

    // Site Dashboard
    private SiteDashboard siteDashboard;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SiteDashboard {
        private BigDecimal contractValue;
        private BigDecimal totalReceived;
        private BigDecimal pendingAmount;
        private BigDecimal totalExpense;
        private BigDecimal profitLoss;
        private Map<String, BigDecimal> expenseSummary;
        private MaterialSummary materialSummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MaterialSummary {
        private BigDecimal purchased;
        private BigDecimal shifted;
        private BigDecimal consumed;
        private BigDecimal balance;
    }
}
