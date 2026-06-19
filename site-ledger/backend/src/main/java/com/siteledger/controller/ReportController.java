package com.siteledger.controller;

import com.siteledger.service.ReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    /**
     * Download site report as Excel (.xlsx)
     */
    @GetMapping("/site/{siteId}/excel")
    public ResponseEntity<byte[]> downloadSiteExcel(@PathVariable Long siteId) {
        byte[] data = reportService.generateSiteExcelReport(siteId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=site-ledger-report-" + siteId + ".xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    /**
     * Download site report as PDF
     */
    @GetMapping("/site/{siteId}/pdf")
    public ResponseEntity<byte[]> downloadSitePdf(@PathVariable Long siteId) {
        byte[] data = reportService.generateSitePdfReport(siteId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=site-ledger-report-" + siteId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}
