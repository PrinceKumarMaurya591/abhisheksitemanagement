package com.siteledger.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.siteledger.dto.DashboardResponse;
import com.siteledger.entity.*;
import com.siteledger.repository.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReportService {

    private final SiteRepository siteRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final MaterialRepository materialRepository;
    private final LabourRegistrationRepository labourRegistrationRepository;
    private final DashboardService dashboardService;

    public ReportService(SiteRepository siteRepository,
                          LedgerEntryRepository ledgerEntryRepository,
                          MaterialRepository materialRepository,
                          LabourRegistrationRepository labourRegistrationRepository,
                          DashboardService dashboardService) {
        this.siteRepository = siteRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.materialRepository = materialRepository;
        this.labourRegistrationRepository = labourRegistrationRepository;
        this.dashboardService = dashboardService;
    }

    // ==================== EXCEL ====================

    public byte[] generateSiteExcelReport(Long siteId) {
        SiteEntity site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("Site not found"));
        DashboardResponse.SiteDashboard dashboard = dashboardService.getSiteDashboard(siteId);

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            org.apache.poi.ss.usermodel.Font titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setColor(IndexedColors.WHITE.getIndex());
            titleFont.setFontHeightInPoints((short) 12);

            org.apache.poi.ss.usermodel.Font labelFont = wb.createFont();
            labelFont.setBold(true);
            labelFont.setFontHeightInPoints((short) 11);

            org.apache.poi.ss.usermodel.Font normalFont = wb.createFont();

            CellStyle headerStyle = createStyle(wb, titleFont, IndexedColors.INDIGO.getIndex());
            CellStyle labelStyle = createStyle(wb, labelFont, null);
            CellStyle valueStyle = createStyle(wb, normalFont, null);
            CellStyle currencyStyle = createStyle(wb, normalFont, null);
            currencyStyle.setDataFormat(wb.createDataFormat().getFormat("#,##0.00"));

            Sheet summarySheet = wb.createSheet("Summary");
            createSummarySheet(summarySheet, site, dashboard, headerStyle, labelStyle, valueStyle);

            Sheet expenseSheet = wb.createSheet("Expenses");
            createExpenseSheet(expenseSheet, siteId, headerStyle, valueStyle, currencyStyle);

            Sheet materialSheet = wb.createSheet("Materials");
            createMaterialSheet(materialSheet, siteId, headerStyle, valueStyle);

            Sheet labourSheet = wb.createSheet("Labour");
            createLabourSheet(labourSheet, siteId, headerStyle, valueStyle);

            Sheet ledgerSheet = wb.createSheet("Ledger");
            createLedgerSheet(ledgerSheet, siteId, headerStyle, valueStyle, currencyStyle);

            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Excel report: " + e.getMessage(), e);
        }
    }

    private CellStyle createStyle(Workbook wb, org.apache.poi.ss.usermodel.Font font, Short bgColor) {
        CellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        if (bgColor != null) {
            style.setFillForegroundColor(bgColor);
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        return style;
    }

    private void createSummarySheet(Sheet sheet, SiteEntity site,
                                     DashboardResponse.SiteDashboard dashboard,
                                     CellStyle headerStyle, CellStyle labelStyle,
                                     CellStyle valueStyle) {
        int r = 0;
        Row titleRow = sheet.createRow(r++);
        org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Site Ledger Report - " + site.getSiteName());
        titleCell.setCellStyle(headerStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));
        r++;

        String[][] rows = {
            {"Site Name", site.getSiteName()},
            {"Department", site.getDepartment() != null ? site.getDepartment() : "-"},
            {"Work Name", site.getWorkName() != null ? site.getWorkName() : "-"},
            {"Contract Value", formatCurrency(dashboard.getContractValue())},
            {"Total Received", formatCurrency(dashboard.getTotalReceived())},
            {"Total Expense", formatCurrency(dashboard.getTotalExpense())},
            {"Profit / Loss", formatCurrency(dashboard.getProfitLoss())},
            {"Pending Amount", formatCurrency(dashboard.getPendingAmount())},
            {"Progress", dashboard.getProgressPercentage() + "%"},
            {"Report Generated", LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy"))},
        };

        for (String[] row : rows) {
            Row dataRow = sheet.createRow(r++);
            org.apache.poi.ss.usermodel.Cell label = dataRow.createCell(0);
            label.setCellValue(row[0]);
            label.setCellStyle(labelStyle);
            org.apache.poi.ss.usermodel.Cell value = dataRow.createCell(1);
            value.setCellValue(row[1]);
            value.setCellStyle(valueStyle);
            sheet.addMergedRegion(new CellRangeAddress(r - 1, r - 1, 1, 3));
        }
        sheet.setColumnWidth(0, 5000);
        sheet.setColumnWidth(1, 8000);
    }

    private void createExpenseSheet(Sheet sheet, Long siteId, CellStyle headerStyle,
                                     CellStyle valueStyle, CellStyle currencyStyle) {
        int r = 0;
        Row header = sheet.createRow(r++);
        for (int i = 0; i < 2; i++) {
            org.apache.poi.ss.usermodel.Cell c = header.createCell(i);
            c.setCellValue(i == 0 ? "Category" : "Amount");
            c.setCellStyle(headerStyle);
        }
        List<LedgerEntryEntity> entries = ledgerEntryRepository.findBySiteIdOrderByEntryDateDesc(siteId);
        for (LedgerEntryEntity entry : entries) {
            Row dataRow = sheet.createRow(r++);
            org.apache.poi.ss.usermodel.Cell catCell = dataRow.createCell(0);
            catCell.setCellValue(entry.getCategory().name());
            catCell.setCellStyle(valueStyle);
            org.apache.poi.ss.usermodel.Cell amtCell = dataRow.createCell(1);
            amtCell.setCellValue(entry.getAmount().doubleValue());
            amtCell.setCellStyle(currencyStyle);
        }
        sheet.setColumnWidth(0, 5000);
        sheet.setColumnWidth(1, 5000);
    }

    private void createMaterialSheet(Sheet sheet, Long siteId, CellStyle headerStyle, CellStyle valueStyle) {
        int r = 0;
        String[] cols = {"Material", "Type", "Unit", "Purchased", "Shifted", "Consumed", "Balance"};
        Row header = sheet.createRow(r++);
        for (int i = 0; i < cols.length; i++) {
            org.apache.poi.ss.usermodel.Cell c = header.createCell(i);
            c.setCellValue(cols[i]);
            c.setCellStyle(headerStyle);
        }
        for (MaterialEntity mat : materialRepository.findBySiteId(siteId)) {
            Row dataRow = sheet.createRow(r++);
            dataRow.createCell(0).setCellValue(mat.getMaterialName());
            dataRow.createCell(1).setCellValue(mat.getMaterialType());
            dataRow.createCell(2).setCellValue(mat.getUnit() != null ? mat.getUnit() : "");
            dataRow.createCell(3).setCellValue(mat.getPurchasedQty() != null ? mat.getPurchasedQty().doubleValue() : 0);
            dataRow.createCell(4).setCellValue(mat.getShiftedQty() != null ? mat.getShiftedQty().doubleValue() : 0);
            dataRow.createCell(5).setCellValue(mat.getConsumedQty() != null ? mat.getConsumedQty().doubleValue() : 0);
            dataRow.createCell(6).setCellValue(mat.getBalanceQty() != null ? mat.getBalanceQty().doubleValue() : 0);
        }
        for (int i = 0; i < 7; i++) sheet.setColumnWidth(i, 4000);
    }

    private void createLabourSheet(Sheet sheet, Long siteId, CellStyle headerStyle, CellStyle valueStyle) {
        int r = 0;
        String[] cols = {"Labour", "Category", "Rate/Day", "Status"};
        Row header = sheet.createRow(r++);
        for (int i = 0; i < cols.length; i++) {
            org.apache.poi.ss.usermodel.Cell c = header.createCell(i);
            c.setCellValue(cols[i]);
            c.setCellStyle(headerStyle);
        }
        for (LabourRegistrationEntity lab : labourRegistrationRepository.findBySiteIdOrderByNameAsc(siteId)) {
            Row dataRow = sheet.createRow(r++);
            dataRow.createCell(0).setCellValue(lab.getName());
            dataRow.createCell(1).setCellValue(lab.getCategory());
            dataRow.createCell(2).setCellValue(lab.getRatePerDay().doubleValue());
            dataRow.createCell(3).setCellValue(lab.getStatus().name());
        }
        sheet.setColumnWidth(0, 5000);
        sheet.setColumnWidth(1, 4000);
        sheet.setColumnWidth(2, 3000);
        sheet.setColumnWidth(3, 3000);
    }

    private void createLedgerSheet(Sheet sheet, Long siteId, CellStyle headerStyle,
                                    CellStyle valueStyle, CellStyle currencyStyle) {
        int r = 0;
        String[] cols = {"Date", "Particulars", "Category", "Type", "Amount"};
        Row header = sheet.createRow(r++);
        for (int i = 0; i < cols.length; i++) {
            org.apache.poi.ss.usermodel.Cell c = header.createCell(i);
            c.setCellValue(cols[i]);
            c.setCellStyle(headerStyle);
        }
        for (LedgerEntryEntity entry : ledgerEntryRepository.findBySiteIdOrderByEntryDateDesc(siteId)) {
            Row dataRow = sheet.createRow(r++);
            dataRow.createCell(0).setCellValue(entry.getEntryDate() != null ? entry.getEntryDate().toString() : "");
            dataRow.createCell(1).setCellValue(entry.getParticulars());
            dataRow.createCell(2).setCellValue(entry.getCategory().name());
            dataRow.createCell(3).setCellValue(entry.getEntryType().name());
            org.apache.poi.ss.usermodel.Cell amt = dataRow.createCell(4);
            amt.setCellValue(entry.getAmount().doubleValue());
            amt.setCellStyle(currencyStyle);
        }
        sheet.setColumnWidth(0, 3000);
        sheet.setColumnWidth(1, 8000);
        sheet.setColumnWidth(2, 4000);
        sheet.setColumnWidth(3, 3000);
        sheet.setColumnWidth(4, 4000);
    }

    // ==================== PDF ====================

    public byte[] generateSitePdfReport(Long siteId) {
        SiteEntity site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("Site not found"));
        DashboardResponse.SiteDashboard dashboard = dashboardService.getSiteDashboard(siteId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);
            document.open();

            com.lowagie.text.Font titleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 18, com.lowagie.text.Font.BOLD, new Color(79, 70, 229));
            Paragraph title = new Paragraph("Site Ledger Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            com.lowagie.text.Font subFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 14);
            Paragraph subTitle = new Paragraph(site.getSiteName(), subFont);
            subTitle.setAlignment(Element.ALIGN_CENTER);
            document.add(subTitle);
            document.add(new Paragraph(" "));

            com.lowagie.text.Font boldFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font normalFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10);

            document.add(new Paragraph("Site Information", boldFont));
            document.add(new Paragraph("Department: " + (site.getDepartment() != null ? site.getDepartment() : "-"), normalFont));
            document.add(new Paragraph("Work Name: " + (site.getWorkName() != null ? site.getWorkName() : "-"), normalFont));
            document.add(new Paragraph("Status: " + (site.getStatus() != null ? site.getStatus().name() : "-"), normalFont));
            document.add(new Paragraph(" "));

            // KPI Table
            PdfPTable kpiTable = new PdfPTable(4);
            kpiTable.setWidthPercentage(100);
            kpiTable.setSpacingBefore(10f);
            kpiTable.setSpacingAfter(10f);

            com.lowagie.text.Font headerFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10, com.lowagie.text.Font.BOLD, Color.WHITE);

            String[][] kpiData = {
                {"Contract Value", formatCurrency(dashboard.getContractValue()), "Total Received", formatCurrency(dashboard.getTotalReceived())},
                {"Total Expense", formatCurrency(dashboard.getTotalExpense()), "Profit/Loss", formatCurrency(dashboard.getProfitLoss())},
                {"Pending", formatCurrency(dashboard.getPendingAmount()), "Progress", dashboard.getProgressPercentage() + "%"},
            };

            for (int i = 0; i < 4; i++) {
                PdfPCell cell = new PdfPCell(new Phrase(new String[]{"Metric", "Value", "Metric", "Value"}[i], headerFont));
                cell.setBackgroundColor(new Color(79, 70, 229));
                cell.setPadding(5);
                kpiTable.addCell(cell);
            }
            for (String[] row : kpiData) {
                for (String val : row) {
                    PdfPCell cell = new PdfPCell(new Phrase(val, normalFont));
                    cell.setPadding(5);
                    kpiTable.addCell(cell);
                }
            }
            document.add(kpiTable);

            // Expense Summary
            document.add(new Paragraph("Expense Summary", boldFont));
            PdfPTable expenseTable = new PdfPTable(2);
            expenseTable.setWidthPercentage(60);
            expenseTable.setSpacingBefore(5f);

            PdfPCell eh1 = new PdfPCell(new Phrase("Category", headerFont));
            eh1.setBackgroundColor(new Color(79, 70, 229));
            eh1.setPadding(5);
            expenseTable.addCell(eh1);
            PdfPCell eh2 = new PdfPCell(new Phrase("Amount", headerFont));
            eh2.setBackgroundColor(new Color(79, 70, 229));
            eh2.setPadding(5);
            expenseTable.addCell(eh2);

            if (dashboard.getExpenseSummary() != null) {
                for (var entry : dashboard.getExpenseSummary().entrySet()) {
                    expenseTable.addCell(new Phrase(entry.getKey(), normalFont));
                    expenseTable.addCell(new Phrase(formatCurrency(entry.getValue()), normalFont));
                }
            }
            document.add(expenseTable);

            document.add(new Paragraph(" "));
            com.lowagie.text.Font smallFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 8, com.lowagie.text.Font.NORMAL, new Color(150, 150, 150));
            document.add(new Paragraph("Generated on: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")), smallFont));
            document.add(new Paragraph("Site Ledger ERP System", smallFont));

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report: " + e.getMessage(), e);
        }
    }

    private String formatCurrency(BigDecimal value) {
        if (value == null) return "₹0";
        return "₹" + String.format("%,.2f", value);
    }
}
