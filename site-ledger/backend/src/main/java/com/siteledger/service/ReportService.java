package com.siteledger.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
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
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service for generating Excel and PDF reports.
 */
@Service
public class ReportService {

    private final SiteRepository siteRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final MaterialRepository materialRepository;
    private final LabourRegistrationRepository labourRegistrationRepository;
    private final LabourPaymentRepository labourPaymentRepository;
    private final DashboardService dashboardService;

    public ReportService(SiteRepository siteRepository,
                          LedgerEntryRepository ledgerEntryRepository,
                          MaterialRepository materialRepository,
                          LabourRegistrationRepository labourRegistrationRepository,
                          LabourPaymentRepository labourPaymentRepository,
                          DashboardService dashboardService) {
        this.siteRepository = siteRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.materialRepository = materialRepository;
        this.labourRegistrationRepository = labourRegistrationRepository;
        this.labourPaymentRepository = labourPaymentRepository;
        this.dashboardService = dashboardService;
    }

    // ==================== EXCEL ====================

    public byte[] generateSiteExcelReport(Long siteId) {
        SiteEntity site = siteRepository.findById(siteId)
                .orElseThrow(() -> new RuntimeException("Site not found"));
        var dashboard = dashboardService.getSiteDashboard(siteId);

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            CellStyle headerStyle = createHeaderStyle(wb);
            CellStyle labelStyle = createLabelStyle(wb);
            CellStyle valueStyle = createValueStyle(wb);
            CellStyle currencyStyle = createCurrencyStyle(wb);

            // Sheet 1: Summary
            Sheet summarySheet = wb.createSheet("Summary");
            createSummarySheet(summarySheet, site, dashboard, headerStyle, labelStyle, valueStyle, currencyStyle);

            // Sheet 2: Expense Breakdown
            Sheet expenseSheet = wb.createSheet("Expenses");
            createExpenseSheet(expenseSheet, siteId, headerStyle, valueStyle, currencyStyle);

            // Sheet 3: Materials
            Sheet materialSheet = wb.createSheet("Materials");
            createMaterialSheet(materialSheet, siteId, headerStyle, valueStyle);

            // Sheet 4: Labour
            Sheet labourSheet = wb.createSheet("Labour");
            createLabourSheet(labourSheet, siteId, headerStyle, valueStyle, currencyStyle);

            // Sheet 5: Ledger
            Sheet ledgerSheet = wb.createSheet("Ledger");
            createLedgerSheet(ledgerSheet, siteId, headerStyle, valueStyle, currencyStyle);

            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Excel report: " + e.getMessage(), e);
        }
    }

    private void createSummarySheet(Sheet sheet, SiteEntity site,
                                     DashboardService.SiteDashboard dashboard,
                                     CellStyle headerStyle, CellStyle labelStyle,
                                     CellStyle valueStyle, CellStyle currencyStyle) {
        int row = 0;
        // Title
        Row titleRow = sheet.createRow(row++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Site Ledger Report - " + site.getSiteName());
        titleCell.setCellStyle(headerStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));
        row++;

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

        for (String[] r : rows) {
            Row dataRow = sheet.createRow(row++);
            Cell label = dataRow.createCell(0);
            label.setCellValue(r[0]);
            label.setCellStyle(labelStyle);
            Cell value = dataRow.createCell(1);
            value.setCellValue(r[1]);
            value.setCellStyle(valueStyle);
            sheet.addMergedRegion(new CellRangeAddress(row - 1, row - 1, 1, 3));
        }

        sheet.setColumnWidth(0, 5000);
        sheet.setColumnWidth(1, 8000);
    }

    private void createExpenseSheet(Sheet sheet, Long siteId, CellStyle headerStyle,
                                     CellStyle valueStyle, CellStyle currencyStyle) {
        int row = 0;
        Row header = sheet.createRow(row++);
        String[] cols = {"Category", "Amount"};
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(headerStyle);
        }

        List<LedgerEntryEntity> entries = ledgerEntryRepository.findBySiteIdOrderByEntryDateDesc(siteId);
        for (LedgerEntryEntity entry : entries) {
            Row dataRow = sheet.createRow(row++);
            Cell catCell = dataRow.createCell(0);
            catCell.setCellValue(entry.getCategory().name());
            catCell.setCellStyle(valueStyle);
            Cell amtCell = dataRow.createCell(1);
            amtCell.setCellValue(entry.getAmount().doubleValue());
            amtCell.setCellStyle(currencyStyle);
        }

        sheet.setColumnWidth(0, 5000);
        sheet.setColumnWidth(1, 5000);
    }

    private void createMaterialSheet(Sheet sheet, Long siteId, CellStyle headerStyle, CellStyle valueStyle) {
        int row = 0;
        Row header = sheet.createRow(row++);
        String[] cols = {"Material", "Type", "Unit", "Purchased", "Shifted", "Consumed", "Balance"};
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(headerStyle);
        }

        List<MaterialEntity> materials = materialRepository.findBySiteId(siteId);
        for (MaterialEntity mat : materials) {
            Row dataRow = sheet.createRow(row++);
            dataRow.createCell(0).setCellValue(mat.getMaterialName());
            dataRow.createCell(1).setCellValue(mat.getMaterialType());
            dataRow.createCell(2).setCellValue(mat.getUnit() != null ? mat.getUnit() : "");
            dataRow.createCell(3).setCellValue(mat.getPurchasedQty() != null ? mat.getPurchasedQty().doubleValue() : 0);
            dataRow.createCell(4).setCellValue(mat.getShiftedQty() != null ? mat.getShiftedQty().doubleValue() : 0);
            dataRow.createCell(5).setCellValue(mat.getConsumedQty() != null ? mat.getConsumedQty().doubleValue() : 0);
            dataRow.createCell(6).setCellValue(mat.getBalanceQty() != null ? mat.getBalanceQty().doubleValue() : 0);
        }

        sheet.setColumnWidth(0, 5000);
        sheet.setColumnWidth(1, 3000);
        sheet.setColumnWidth(2, 3000);
        for (int i = 3; i <= 6; i++) sheet.setColumnWidth(i, 4000);
    }

    private void createLabourSheet(Sheet sheet, Long siteId, CellStyle headerStyle,
                                    CellStyle valueStyle, CellStyle currencyStyle) {
        int row = 0;
        Row header = sheet.createRow(row++);
        String[] cols = {"Labour", "Category", "Rate/Day", "Status"};
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(headerStyle);
        }

        List<LabourRegistrationEntity> labourers = labourRegistrationRepository.findBySiteIdOrderByNameAsc(siteId);
        for (LabourRegistrationEntity lab : labourers) {
            Row dataRow = sheet.createRow(row++);
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
        int row = 0;
        Row header = sheet.createRow(row++);
        String[] cols = {"Date", "Particulars", "Category", "Type", "Amount"};
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(headerStyle);
        }

        List<LedgerEntryEntity> entries = ledgerEntryRepository.findBySiteIdOrderByEntryDateDesc(siteId);
        for (LedgerEntryEntity entry : entries) {
            Row dataRow = sheet.createRow(row++);
            dataRow.createCell(0).setCellValue(entry.getEntryDate() != null ? entry.getEntryDate().toString() : "");
            dataRow.createCell(1).setCellValue(entry.getParticulars());
            dataRow.createCell(2).setCellValue(entry.getCategory().name());
            dataRow.createCell(3).setCellValue(entry.getEntryType().name());
            dataRow.createCell(4).setCellValue(entry.getAmount().doubleValue());
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
        var dashboard = dashboardService.getSiteDashboard(siteId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Title
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(79, 70, 229));
            Paragraph title = new Paragraph("Site Ledger Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subTitle = new Paragraph(site.getSiteName(), FontFactory.getFont(FontFactory.HELVETICA, 14));
            subTitle.setAlignment(Element.ALIGN_CENTER);
            document.add(subTitle);
            document.add(new Paragraph(" "));

            // Site Info
            document.add(new Paragraph("Site Information", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
            document.add(new Paragraph("Department: " + (site.getDepartment() != null ? site.getDepartment() : "-")));
            document.add(new Paragraph("Work Name: " + (site.getWorkName() != null ? site.getWorkName() : "-")));
            document.add(new Paragraph("Status: " + (site.getStatus() != null ? site.getStatus().name() : "-")));
            document.add(new Paragraph(" "));

            // KPI Table
            PdfPTable kpiTable = new PdfPTable(4);
            kpiTable.setWidthPercentage(100);
            kpiTable.setSpacingBefore(10f);
            kpiTable.setSpacingAfter(10f);

            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            String[] kpiHeaders = {"Metric", "Value", "Metric", "Value"};
            String[][] kpiData = {
                {"Contract Value", formatCurrency(dashboard.getContractValue()), "Total Received", formatCurrency(dashboard.getTotalReceived())},
                {"Total Expense", formatCurrency(dashboard.getTotalExpense()), "Profit/Loss", formatCurrency(dashboard.getProfitLoss())},
                {"Pending", formatCurrency(dashboard.getPendingAmount()), "Progress", dashboard.getProgressPercentage() + "%"},
            };

            for (String h : kpiHeaders) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(new Color(79, 70, 229));
                cell.setPadding(5);
                kpiTable.addCell(cell);
            }

            for (String[] row : kpiData) {
                for (String val : row) {
                    PdfPCell cell = new PdfPCell(new Phrase(val, valueFont));
                    cell.setPadding(5);
                    kpiTable.addCell(cell);
                }
            }
            document.add(kpiTable);

            // Expense Summary
            document.add(new Paragraph("Expense Summary", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
            PdfPTable expenseTable = new PdfPTable(2);
            expenseTable.setWidthPercentage(60);
            expenseTable.setSpacingBefore(5f);

            PdfPCell expHeader1 = new PdfPCell(new Phrase("Category", headerFont));
            expHeader1.setBackgroundColor(new Color(79, 70, 229));
            expHeader1.setPadding(5);
            expenseTable.addCell(expHeader1);
            PdfPCell expHeader2 = new PdfPCell(new Phrase("Amount", headerFont));
            expHeader2.setBackgroundColor(new Color(79, 70, 229));
            expHeader2.setPadding(5);
            expenseTable.addCell(expHeader2);

            if (dashboard.getExpenseSummary() != null) {
                for (var entry : dashboard.getExpenseSummary().entrySet()) {
                    expenseTable.addCell(new Phrase(entry.getKey(), valueFont));
                    expenseTable.addCell(new Phrase(formatCurrency(entry.getValue()), valueFont));
                }
            }
            document.add(expenseTable);

            document.add(new Paragraph(" "));
            document.add(new Paragraph("Generated on: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")),
                    FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(150, 150, 150))));
            document.add(new Paragraph("Site Ledger ERP System",
                    FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(150, 150, 150))));

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report: " + e.getMessage(), e);
        }
    }

    // ==================== HELPERS ====================

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createLabelStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createValueStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFont(wb.createFont());
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFont(wb.createFont());
        style.setDataFormat(wb.createDataFormat().getFormat("#,##0.00"));
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private String formatCurrency(BigDecimal value) {
        if (value == null) return "₹0";
        return "₹" + String.format("%,.2f", value);
    }
}
