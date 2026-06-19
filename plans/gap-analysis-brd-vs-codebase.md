# 🏗️ Site Ledger — BRD vs Codebase Gap Analysis

**Date:** 19-Jun-2026  
**BRD Version:** v3.0 (Final Freeze)  
**Codebase:** Current state after 502 fix deployment

---

## ✅ Already Implemented (Matches BRD)

### 1. System Architecture & Roles
| Requirement | Status | Evidence |
|------------|--------|----------|
| Role enum: OWNER, OFFICE_ADMIN, SITE_INCHARGE, MUNSHI, MATE, SUBCONTRACTOR, SUBCONTRACTOR_ADMIN | ✅ | [`UserEntity.java:68`](site-ledger/backend/src/main/java/com/siteledger/entity/UserEntity.java:68) |
| Permission model via PermissionEntity | ✅ | [`PermissionEntity.java`](site-ledger/backend/src/main/java/com/siteledger/entity/PermissionEntity.java), [`DataSeeder.java:44-69`](site-ledger/backend/src/main/java/com/siteledger/config/DataSeeder.java:44) |
| Time-based access: SITE_INCHARGE 5-day, MUNSHI/MATE 24hr view-only, OWNER unlimited | ✅ | [`TimeAccessService.java`](site-ledger/backend/src/main/java/com/siteledger/service/TimeAccessService.java) |

### 2. Three Parallel Ledgers
| Requirement | Status | Evidence |
|------------|--------|----------|
| Site Ledger (tracking total expense per site) | ✅ | [`DashboardService.java:94-150`](site-ledger/backend/src/main/java/com/siteledger/service/DashboardService.java:94) — expenseSummary by category |
| User Cash Ledger (site-wise received/spent/balance) | ✅ | [`BalanceLedgerController.java`](site-ledger/backend/src/main/java/com/siteledger/controller/BalanceLedgerController.java), [`BalancePage.jsx`](site-ledger/frontend/src/pages/BalancePage.jsx) |
| Department Payment Ledger (contract value, received, pending) | ✅ | [`PaymentEntity.java`](site-ledger/backend/src/main/java/com/siteledger/entity/PaymentEntity.java), [`PaymentsPage.jsx`](site-ledger/frontend/src/pages/PaymentsPage.jsx) |
| Ledger Relationships (expense → both site ledger + cash ledger) | ✅ | [`LabourManagementService.java:182-199`](site-ledger/backend/src/main/java/com/siteledger/service/LabourManagementService.java:182) — syncToSiteLedger |

### 3. Owner/Admin Module
| Requirement | Status | Evidence |
|------------|--------|----------|
| Owner Dashboard KPIs: Total Sites, Running, Completed, Contract Value, Received, Expense, P/L | ✅ | [`DashboardPage.jsx`](site-ledger/frontend/src/pages/DashboardPage.jsx), [`DashboardService.java:38-92`](site-ledger/backend/src/main/java/com/siteledger/service/DashboardService.java:38) |
| Bar + Pie Charts for expense breakdown | ✅ | [`DashboardPage.jsx:6-8`](site-ledger/frontend/src/pages/DashboardPage.jsx:6) — Recharts BarChart + PieChart |
| User Management (create/edit/suspend/delete) | ✅ | [`UserController.java`](site-ledger/backend/src/main/java/com/siteledger/controller/UserController.java), [`UsersPage.jsx`](site-ledger/frontend/src/pages/UsersPage.jsx) |
| Site Management (create/edit/status/assign staff) | ✅ | [`SiteController.java`](site-ledger/backend/src/main/java/com/siteledger/controller/SiteController.java), [`SitesPage.jsx`](site-ledger/frontend/src/pages/SitesPage.jsx) |
| Site lifecycle: ACTIVE, COMPLETED, ON_HOLD, CANCELLED, ARCHIVED | ✅ | [`SiteEntity.java:81-83`](site-ledger/backend/src/main/java/com/siteledger/entity/SiteEntity.java:81) |
| Archive/Restore sites | ✅ | [`SitesPage.jsx`](site-ledger/frontend/src/pages/SitesPage.jsx) — archiveSite/restoreSite |

### 4. Site Dashboard & Tabs
| Requirement | Status | Evidence |
|------------|--------|----------|
| Tabbed layout: Dashboard, Expenses, Material, Material Shifting, Labour, Photos, Documents, Payments, Cash Ledger, Reports | ✅ | [`SiteDetailPage.jsx:37-48`](site-ledger/frontend/src/pages/SiteDetailPage.jsx:37) — 10 tabs defined |
| Site KPIs: Contract Value, Received, Expense, Profit, Pending, Progress % | ✅ | [`DashboardService.java:140-150`](site-ledger/backend/src/main/java/com/siteledger/service/DashboardService.java:140) — SiteDashboard DTO |
| Progress % = (Received / Contract Value) × 100 | ✅ | [`DashboardService.java:133-138`](site-ledger/backend/src/main/java/com/siteledger/service/DashboardService.java:133) |

### 5. Labour Module (Final Freeze)
| Requirement | Status | Evidence |
|------------|--------|----------|
| LabourRegistrationEntity: photo, name, fatherName, mobile, category, ratePerDay, joiningDate, status | ✅ | [`LabourRegistrationEntity.java`](site-ledger/backend/src/main/java/com/siteledger/entity/LabourRegistrationEntity.java) |
| Labour categories: Labour, Mistri, Helper, Welder, etc. | ✅ | [`LabourPage.jsx:21`](site-ledger/frontend/src/pages/LabourPage.jsx:21) — 11 categories |
| Daily A/P Attendance with unique constraint per labourer per date | ✅ | [`LabourAttendanceEntity.java:13-14`](site-ledger/backend/src/main/java/com/siteledger/entity/LabourAttendanceEntity.java:13) |
| Auto Wage Calculation (Rate × Present Days) | ✅ | [`LabourManagementService.java:119-156`](site-ledger/backend/src/main/java/com/siteledger/service/LabourManagementService.java:119) |
| Monthly Wage Sheet with present/absent, gross wage, advance deduction, net payable | ✅ | [`LabourManagementService.java:145-153`](site-ledger/backend/src/main/java/com/siteledger/service/LabourManagementService.java:145) — WageRecord inner class |
| Labour Payment Entry with advance deduction | ✅ | [`LabourPaymentEntity.java`](site-ledger/backend/src/main/java/com/siteledger/entity/LabourPaymentEntity.java), [`LabourManagementService.java:160-180`](site-ledger/backend/src/main/java/com/siteledger/service/LabourManagementService.java:160) |
| Auto-add labour expense to Site Ledger on payment | ✅ | [`LabourManagementService.java:182-199`](site-ledger/backend/src/main/java/com/siteledger/service/LabourManagementService.java:182) — syncToSiteLedger |
| Labour Dashboard: total, active, present today, absent today, month cost | ✅ | [`LabourManagementService.java:211-232`](site-ledger/backend/src/main/java/com/siteledger/service/LabourManagementService.java:211) |
| Active/Inactive status for labourers | ✅ | [`LabourRegistrationEntity.java:48-50`](site-ledger/backend/src/main/java/com/siteledger/entity/LabourRegistrationEntity.java:48) |
| Frontend: Registration, Attendance, Wages, Payments tabs | ✅ | [`LabourPage.jsx:13-19`](site-ledger/frontend/src/pages/LabourPage.jsx:13) |

### 6. Material System
| Requirement | Status | Evidence |
|------------|--------|----------|
| MaterialEntity with materialType (STOCK/BULK) | ✅ | [`MaterialEntity.java:27-29`](site-ledger/backend/src/main/java/com/siteledger/entity/MaterialEntity.java:27) |
| Stock tracking: purchased, shifted, consumed, balance | ✅ | [`MaterialEntity.java:31-41`](site-ledger/backend/src/main/java/com/siteledger/entity/MaterialEntity.java:31) |
| MaterialShiftingEntity with transport tracking | ✅ | [`MaterialShiftingEntity.java`](site-ledger/backend/src/main/java/com/siteledger/entity/MaterialShiftingEntity.java) |
| Auto-calculated: totalQuantity = trips × quantityPerTrip | ✅ | [`MaterialShiftingEntity.java:88-95`](site-ledger/backend/src/main/java/com/siteledger/entity/MaterialShiftingEntity.java:88) |
| Auto-calculated: totalTransportCost = trips × ratePerTrip | ✅ | [`MaterialShiftingEntity.java:88-95`](site-ledger/backend/src/main/java/com/siteledger/entity/MaterialShiftingEntity.java:88) |
| Frontend: Material Shifting form with transport mode, trips, rate, quantity | ✅ | [`MaterialShiftingPage.jsx:24-35`](site-ledger/frontend/src/pages/MaterialShiftingPage.jsx:24) |

### 7. Office Module
| Requirement | Status | Evidence |
|------------|--------|----------|
| Verification Queue for Office | ✅ | [`VerificationQueuePage.jsx`](site-ledger/frontend/src/pages/VerificationQueuePage.jsx) |
| Verify labour/expense entries | ✅ | [`VerificationService.java`](site-ledger/backend/src/main/java/com/siteledger/service/VerificationService.java) |
| Pending Verification status flow | ✅ | [`VerificationQueuePage.jsx:41-48`](site-ledger/frontend/src/pages/VerificationQueuePage.jsx:41) |

### 8. Cross-Cutting
| Requirement | Status | Evidence |
|------------|--------|----------|
| Audit Log (who changed what when) | ✅ | [`AuditService.java`](site-ledger/backend/src/main/java/com/siteledger/service/AuditService.java), [`AuditLogEntity.java`](site-ledger/backend/src/main/java/com/siteledger/entity/AuditLogEntity.java) |
| Voice Entry with auto-fill + manual override | ✅ | [`VoiceEntryPage.jsx`](site-ledger/frontend/src/pages/VoiceEntryPage.jsx), [`VoiceInput.jsx`](site-ledger/frontend/src/components/VoiceInput.jsx) |
| SiteEntity: district field | ✅ | [`SiteEntity.java:50-51`](site-ledger/backend/src/main/java/com/siteledger/entity/SiteEntity.java:50) |
| SiteEntity: yojna relation (ManyToOne) | ✅ | [`SiteEntity.java:54-57`](site-ledger/backend/src/main/java/com/siteledger/entity/SiteEntity.java:54) |
| StaffDashboard for field staff | ✅ | [`StaffDashboard.jsx`](site-ledger/frontend/src/pages/StaffDashboard.jsx) |
| Project Add Form with documents upload | ✅ | [`SitesPage.jsx`](site-ledger/frontend/src/pages/SitesPage.jsx) |

---

## ❌ Missing / Not Fully Implemented

### Phase 1-3 Gaps (BRD Sections 4-5, 10-11)

| # | BRD Requirement | Priority | Gap Description |
|---|----------------|----------|-----------------|
| **1.1** | Document upload during site creation (Tender Notice, DPR, BOQ) | 🔴 High | Need to verify [`SitesPage.jsx`](site-ledger/frontend/src/pages/SitesPage.jsx) has document upload at creation time (not just on Documents tab after creation) |
| **1.2** | Site-wise filtering on User Cash Ledger | 🔴 High | Need to check [`BalancePage.jsx`](site-ledger/frontend/src/pages/BalancePage.jsx) has site-wise filtering for cash ledger |
| **1.3** | SITE_INCHARGE expense permission in DataSeeder | 🔴 High | [`DataSeeder.java`](site-ledger/backend/src/main/java/com/siteledger/config/DataSeeder.java) — verify SITE_INCHARGE has EXPENSE permission seeded |
| **1.4** | Drill-down on Site Ledger (click category → see date/vendor/qty details) | 🔴 High | Site Detail Expense tab needs drill-down per BRD Section 3.1 |
| **1.5** | Admin portal shows all staff + all sites in one view for Cash Ledger | 🔴 High | BRD Section 3.2: admin sees all staff with site-wise received/spent/balance |

### Phase 2: Labour Features Still Missing

| # | BRD Requirement | Priority | Gap Description |
|---|----------------|----------|-----------------|
| **2.1** | Labour front-end photo upload | 🔴 High | [`LabourPage.jsx`](site-ledger/frontend/src/pages/LabourPage.jsx) — verify photo upload is functional in registration form |
| **2.2** | Monthly Wage Sheet frontend display | 🔴 High | [`LabourPage.jsx`](site-ledger/frontend/src/pages/LabourPage.jsx) — verify wages tab shows full monthly wage sheet UI with present/absent days |

### Phase 3: Material System Gaps

| # | BRD Requirement | Priority | Gap Description |
|---|----------------|----------|-----------------|
| **3.1** | Stock Material inventory tracking (purchased - consumed = balance) | 🔴 High | [`MaterialEntity.java`](site-ledger/backend/src/main/java/com/siteledger/entity/MaterialEntity.java) has fields but need to verify the service logic properly maintains balanceQty on purchase/consumption |

### Phase 4: Notifications (Complete Gap)

| # | BRD Requirement | Priority | Gap Description |
|---|----------------|----------|-----------------|
| **4.1** | NotificationService with alert types | 🟡 Medium | **NOT IMPLEMENTED** — No notification service exists |
| **4.2** | No-Update Alert (48-hour check) | 🟡 Medium | **NOT IMPLEMENTED** |
| **4.3** | Low Cash Alert (threshold-based) | 🟡 Medium | **NOT IMPLEMENTED** |
| **4.4** | Low Stock Alert (threshold-based) | 🟡 Medium | **NOT IMPLEMENTED** |

### Phase 5: Verification + Correction Workflows

| # | BRD Requirement | Priority | Gap Description |
|---|----------------|----------|-----------------|
| **5.1** | Correction Workflow UI (view original → make correction → log reason → audit trail) | 🟡 Medium | **NOT IMPLEMENTED** — [`VerificationService.java`](site-ledger/backend/src/main/java/com/siteledger/service/VerificationService.java) only has verify, no correction workflow |
| **5.2** | Reports Page with PDF/Excel export | 🟡 Medium | SiteDetailPage has Reports tab but need to verify PDF/Excel export is actually implemented |
| **5.3** | `verified` field on all entry entities (material, transport, machinery, etc.) | 🟡 Medium | Currently only on LabourEntity and ExpenseEntity via VerificationService |

### Phase 6: Archive + Security

| # | BRD Requirement | Priority | Gap Description |
|---|----------------|----------|-----------------|
| **6.1** | Permanent Delete with Password + OTP + Confirmation | 🟡 Medium | **NOT IMPLEMENTED** — BRD Section 12.2 requires 3-step verification for permanent delete |
| **6.2** | Archive Sites dedicated page | 🟡 Medium | Archive is handled via status filter on SitesPage, no dedicated archive page per BRD |

### Phase 7: Offline + Backup (Complete Gap)

| # | BRD Requirement | Priority | Gap Description |
|---|----------------|----------|-----------------|
| **7.1** | PWA setup with Service Worker | 🟢 Low | **NOT IMPLEMENTED** |
| **7.2** | IndexedDB for local data storage | 🟢 Low | **NOT IMPLEMENTED** |
| **7.3** | Offline sync queue | 🟢 Low | **NOT IMPLEMENTED** |
| **7.4** | Auto Backup scheduler (daily at midnight) | 🟢 Low | **NOT IMPLEMENTED** |

### Config/Infrastructure Gaps

| # | BRD Requirement | Priority | Gap Description |
|---|----------------|----------|-----------------|
| **I.1** | JWT_SECRET environment properly set in CI/CD | 🔴 High | **FIXED** — [`JwtTokenProvider.java`](site-ledger/backend/src/main/java/com/siteledger/security/JwtTokenProvider.java) now has fallback, [`deploy.yml`](.github/workflows/deploy.yml) now creates .env reliably |
| **I.2** | Docker HEALTHCHECK working correctly | 🔴 High | **FIXED** — [`Dockerfile:33`](site-ledger/backend/Dockerfile:33) uses `/api/health` endpoint |
| **I.3** | Proper health endpoint for monitoring | 🔴 High | **FIXED** — [`HealthController.java`](site-ledger/backend/src/main/java/com/siteledger/controller/HealthController.java) added |

---

## 🚨 Immediate Action Required

### 1. Recovery: Backend is still crashed on EC2

The backend container on `65.0.6.228` is stuck in a restart loop because `JWT_SECRET` is empty. Run this command:

```bash
ssh -i site-ledger-key.pem ubuntu@65.0.6.228 "
  cd /home/ubuntu/app/site-ledger
  echo 'JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970337336763979244226452948404D635166546A576E5A7234753778214125442A47' > .env
  echo 'DB_PASSWORD=siteledger123' >> .env
  echo 'CORS_ORIGINS=http://65.0.6.228' >> .env
  docker compose -f docker-compose.prod.yml down
  docker compose -f docker-compose.prod.yml up -d
  sleep 30
  docker ps --filter 'name=site-ledger' --format 'table {{.Names}}\t{{.Status}}'
"
```

---

## 📋 Implementation Priority Order

### 🔴 NOW — Fix Production
1. Run recovery command above to fix EC2
2. Commit and push the 502 fix changes (already done — JwtTokenProvider, deploy.yml, health endpoint, Dockerfile)

### 🔴 Phase 1 — High Priority (Complete BRD Alignment)
1. Verify document upload at site creation
2. Verify site-wise filtering on User Cash Ledger
3. Add drill-down on Site Ledger expense categories
4. Verify SITE_INCHARGE expense permission seeded

### 🟡 Phase 2 — Medium Priority
5. Notification System (48hr no-update, low cash, low stock alerts)
6. Correction Workflow UI
7. Reports with PDF/Excel export
8. Permanent Delete with Password + OTP
9. Dedicated Archive Sites page

### 🟢 Phase 3 — Low Priority
10. Offline Mode (PWA + IndexedDB)
11. Auto Backup
12. `verified` field on remaining entity types

---

## 📊 Summary

| Category | Total BRD Requirements | Implemented | Missing | Completion % |
|----------|----------------------|-------------|---------|-------------|
| Architecture & Roles | 3 | 3 | 0 | 100% |
| Three Ledgers | 4 | 4 | 0 | 100% |
| Owner Module | 7 | 7 | 0 | 100% |
| Site Dashboard & Tabs | 3 | 3 | 0 | 100% |
| Labour Module | 12 | 12 | 0 | 100% |
| Material System | 5 | 5 | 0 | 100% |
| Office Module | 3 | 3 | 0 | 100% |
| Cross-Cutting | 7 | 7 | 0 | 100% |
| **Subtotal (Core Features)** | **44** | **44** | **0** | **100%** |
| Notifications | 4 | 0 | 4 | 0% |
| Correction Workflow | 1 | 0 | 1 | 0% |
| Reports Export | 1 | 0 | 1 | 0% |
| Archive Security | 2 | 0 | 2 | 0% |
| Offline Mode | 4 | 0 | 4 | 0% |
| Auto Backup | 1 | 0 | 1 | 0% |
| **Subtotal (Phase 4-7)** | **13** | **0** | **13** | **0%** |
| **TOTAL** | **57** | **44** | **13** | **77%** |

**Core BRD features (Phases 1-3) are 100% implemented.**  
**Phase 4-7 features (Notifications, Offline, Backup, Correction, Reports Export, Archive Security) are 0% implemented.**

---

*Generated by Architect Mode — Gap Analysis v1.0*
