package com.siteledger.controller;

import com.siteledger.dto.ApiResponse;
import com.siteledger.dto.DashboardResponse;
import com.siteledger.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/owner")
    public ResponseEntity<ApiResponse<DashboardResponse>> getOwnerDashboard() {
        DashboardResponse dashboard = dashboardService.getOwnerDashboard();
        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<DashboardResponse.SiteDashboard>> getSiteDashboard(
            @PathVariable Long siteId) {
        DashboardResponse.SiteDashboard dashboard = dashboardService.getSiteDashboard(siteId);
        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }
}
