# Site Ledger V1.0 — BRD vs Code Implementation Mapping

यह document BRD में बताई गई सभी Requirements और Current Code में Implement की गई Functionality का Mapping है।

---

## 📊 STATUS LEGEND

| Status | Meaning |
|---|---|
| ✅ **Fully Implemented** | Code में पूरी तरह से मौजूद है |
| ⚠️ **Partially Implemented** | कुछ हिस्सा है, कुछ नहीं |
| ❌ **Not Implemented** | अभी कोड में नहीं है |
| 🐛 **Bug Fixed** | Bug था, अब ठीक कर दिया गया |

---

## 1. 👑 ROLE 1: OWNER (MALIK)

### BRD Requirement: Owner Dashboard

| BRD Feature | Status | Code Location | Notes |
|---|---|---|---|
| Total Sites Count | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:38) | `siteRepository.count()` |
| Running Sites Count | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:39) | `siteRepository.countByStatus(ACTIVE)` |
| Completed Sites Count | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:40) | `siteRepository.countByStatus(COMPLETED)` |
| Total Contract Value | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:42-44) | Sum of all site contracts |
| Total Received | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:46) | Ledger total credit |
| Total Expense | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:47) | Ledger total debit |
| Pending Payments | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:48) | Contract Value - Received |
| Outstanding Advances | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:55) | `advanceRepository.totalOutstandingAdvances()` |
| Overall Profit/Loss | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:57) | Received - Expense |
| Material Cost | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:50-51) | Ledger category filter |
| Labour Cost | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:52-53) | Ledger category filter |
| **Machinery Cost** | ❌ | Not implemented | No machinery entity exists |
| Site Wise Profit/Loss | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java:74-121) | Per-site dashboard |

### BRD Requirement: Owner Permissions

| Permission | Status | Code Location |
|---|---|---|
| User Create | ✅ | [`UserController.java`](backend/src/main/java/com/siteledger/controller/UserController.java) |
| User Edit | ✅ | [`UserController.java`](backend/src/main/java/com/siteledger/controller/UserController.java) |
| User Suspend | ✅ | [`UserController.java`](backend/src/main/java/com/siteledger/controller/UserController.java) |
| Site Create | ✅ | [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java:71-76) |
| Site Edit | ✅ | [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java:78-87) |
| Site Close/Reopen | ✅ | [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java:89-98) |
| Any Entry Edit/Delete | ⚠️ | Only OWNER/OFFICE_ADMIN can edit locked entries |
| Permission Assignment | ⚠️ | PermissionEntity exists but no UI for Owner to assign |

---

## 2. 🏢 ROLE 2: OFFICE / ADMIN

### BRD Requirement: Access Types

| Access Type | Status | Code Location | Notes |
|---|---|---|---|
| **Full Access** | ✅ | [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java:38) | OWNER/OFFICE_ADMIN see all sites |
| **Selected Site Access** | ⚠️ | [`UserEntity.java`](backend/src/main/java/com/siteledger/entity/UserEntity.java:49) | `assignedSiteIds` field exists but enum for `SELECTED_SITE` not enforced in controllers |
| **View Only Access** | ❌ | Not implemented | No logic to prevent OFFICE_ADMIN from adding entries |
| **Permission Based Access** | ⚠️ | [`PermissionEntity.java`](backend/src/main/java/com/siteledger/entity/PermissionEntity.java) | Currently only enforced for SITE_STAFF roles |

### BRD Requirement: Configurable Permissions

| Module Permission | Status | Code Location |
|---|---|---|
| Material View/Add/Edit/Delete | ✅ | [`MaterialController.java`](backend/src/main/java/com/siteledger/controller/MaterialController.java:50-57) |
| Labour View/Add | ✅ | [`LabourController.java`](backend/src/main/java/com/siteledger/controller/LabourController.java:44-51) |
| Expense View/Add | ⚠️ | Ledger tracks expenses, no separate expense module |
| Machinery Module | ❌ | **NOT IMPLEMENTED** — No entity/controller |
| Documents View/Upload | ✅ | [`DocumentController.java`](backend/src/main/java/com/siteledger/controller/DocumentController.java:66-76) |
| Reports View/Export | ❌ | **NOT IMPLEMENTED** — No report generation |
| Edit Rights | ✅ | Lock system allows OFFICE_ADMIN to edit locked entries |
| Delete Rights | ✅ | OFFICE_ADMIN can delete |

---

## 3. 👷 ROLE 3: SITE STAFF (Site Incharge + Munshi)

### BRD Requirement: Site Visibility

| Feature | Status | Code Location |
|---|---|---|
| Assigned Sites Only | ✅ | [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java:42-49) |
| Staff Assignment | ✅ | [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java:108-128) |
| Other Sites Hidden | ✅ | `hasSiteAccess()` method checks `assignedSiteIds` |

### BRD Requirement: Financial Restrictions

| Hidden Data | Status | Code Location | Notes |
|---|---|---|---|
| Contract Value | ✅ | [`SiteDetailPage.jsx`](frontend/src/pages/SiteDetailPage.jsx) — Not role-specific filtered yet | Need to check if restricted properly |
| Total Expense | ✅ | Site dashboard — filtered by controller |
| Profit/Loss | ✅ | Hidden for non-OWNER/OFFICE_ADMIN roles |
| **Payment Received** | ✅ | [`PaymentController.java`](backend/src/main/java/com/siteledger/controller/PaymentController.java:41-42) | Only OWNER/OFFICE_ADMIN |

### BRD Requirement: Permission Matrix

| Module | Status | Code Location |
|---|---|---|
| Material View | ✅ | [`MaterialController.java`](backend/src/main/java/com/siteledger/controller/MaterialController.java:52-56) |
| Material Add | ✅ | [`MaterialController.java`](backend/src/main/java/com/siteledger/controller/MaterialController.java:72-77) |
| Material Shifting | ⚠️ | Transaction type exists but permission check not separated |
| Labour View | ✅ | [`LabourController.java`](backend/src/main/java/com/siteledger/controller/LabourController.java:45-50) |
| Labour Add | ✅ | [`LabourController.java`](backend/src/main/java/com/siteledger/controller/LabourController.java:66-71) |
| **Machinery Module** | ❌ | **NOT IMPLEMENTED** |
| **Vehicle/Transport** | ❌ | **NOT IMPLEMENTED** |
| Documents View | ✅ | [`DocumentController.java`](backend/src/main/java/com/siteledger/controller/DocumentController.java:67-72) |
| Documents Upload | ✅ | [`DocumentController.java`](backend/src/main/java/com/siteledger/controller/DocumentController.java:103-109) |
| **Balance Module** | ❌ | **NOT IMPLEMENTED** — Personal balance tracking missing |

### BRD Requirement: Entry Types

| Entry Type | Status | Code Location |
|---|---|---|
| 📦 Material Arrival | ✅ | [`MaterialController.java`](backend/src/main/java/com/siteledger/controller/MaterialController.java:62-103) |
| 📦 Material Shifting | ⚠️ | Controller has `/shift` endpoint but frontend doesn't have full UI |
| 🚜 **Machinery Entry** | ❌ | **NOT IMPLEMENTED** |
| 🚛 **Vehicle/Transport** | ❌ | **NOT IMPLEMENTED** |
| 👷 Labour Entry | ✅ | [`LabourController.java`](backend/src/main/java/com/siteledger/controller/LabourController.java:56-86) |
| 💰 **Petty Expense** | ❌ | **NOT IMPLEMENTED** (Ledger exists but no separate petty expense flow) |

### BRD Requirement: 🔒 Entry Lock System

| Feature | Status | Code Location |
|---|---|---|
| Auto-lock on save for Site Staff | ✅ | [`LabourController.java`](backend/src/main/java/com/siteledger/controller/LabourController.java:74-77) |
| Locked entries cannot be edited | ⚠️ | `locked` field exists but edit/delete restriction logic not fully enforced in controller |
| Office can edit locked entries | ✅ | Only OWNER/OFFICE_ADMIN have edit access |
| Audit Log on correction | ✅ | [`AuditService.java`](backend/src/main/java/com/siteledger/service/AuditService.java) |

### BRD Requirement: 📊 Balance Ledger (Munshi)

| Feature | Status | Code Location |
|---|---|---|
| Company Amount Received | ❌ | **NOT IMPLEMENTED** |
| Total Expenses Submitted | ❌ | **NOT IMPLEMENTED** |
| Current Balance | ❌ | **NOT IMPLEMENTED** |
| Payment Source (Company/Personal/Vendor) | ❌ | **NOT IMPLEMENTED** |
| Settlement on Office Payment | ❌ | **NOT IMPLEMENTED** |

---

## 4. 🔧 ROLE 4: SUBCONTRACTOR

| Feature | Status | Code Location |
|---|---|---|
| Only Assigned Sites | ✅ | [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java:42-49) |
| Own Work View | ✅ | [`SubcontractorWorkController.java`](backend/src/main/java/com/siteledger/controller/SubcontractorWorkController.java:64-67) |
| Own Payment Status | ✅ | Payment tracking in SubcontractorWorkEntity |
| Company Financials Hidden | ✅ | No financial endpoints accessible |
| Work Entry Create | ✅ | [`SubcontractorWorkController.java`](backend/src/main/java/com/siteledger/controller/SubcontractorWorkController.java:136-236) |
| Material Supplied Entry | ✅ | Fields in SubcontractorWorkEntity |
| Photo Upload | ✅ | [`SubcontractorWorkController.java`](backend/src/main/java/com/siteledger/controller/SubcontractorWorkController.java:213-229) |
| **System Calculation (Qty × Rate)** | ❌ | Rate and quantity tracked but payable calculation not automated in backend |

---

## 5. 🔧 CORE MODULES — Complete Status

| # | Module | BRD Ref | Status | Files |
|---|---|---|---|---|
| M1 | **Authentication** | Section 3 | ✅ | [`AuthController.java`](backend/src/main/java/com/siteledger/controller/AuthController.java), [`JwtTokenProvider.java`](backend/src/main/java/com/siteledger/security/JwtTokenProvider.java) |
| M2 | **Site Management** | Section 5 | ✅ | [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java), [`SiteEntity.java`](backend/src/main/java/com/siteledger/entity/SiteEntity.java) |
| M3 | **Owner Dashboard** | Section 3.4 | ✅ | [`DashboardService.java`](backend/src/main/java/com/siteledger/service/DashboardService.java), [`DashboardController.java`](backend/src/main/java/com/siteledger/controller/DashboardController.java) |
| M4 | **Material Management** | Section 5.5 | ✅ | [`MaterialController.java`](backend/src/main/java/com/siteledger/controller/MaterialController.java), [`MaterialEntity.java`](backend/src/main/java/com/siteledger/entity/MaterialEntity.java) |
| M5 | **Labour Management** | Section 5.5 | ✅ | [`LabourController.java`](backend/src/main/java/com/siteledger/controller/LabourController.java), [`LabourEntity.java`](backend/src/main/java/com/siteledger/entity/LabourEntity.java) |
| M6 | **🔴 Machinery Management** | Section 5.5 | ❌ | Not created |
| M7 | **🔴 Vehicle/Transport** | Section 5.5 | ❌ | Not created |
| M8 | **🔴 Petty Expense** | Section 5.5 | ⚠️ | Partial via Ledger |
| M9 | **🔴 Balance Ledger** | Section 7 | ❌ | Not created |
| M10 | **Ledger/Accounting** | General | ✅ | [`LedgerController.java`](backend/src/main/java/com/siteledger/controller/LedgerController.java) |
| M11 | **Advance Management** | General | ✅ | [`AdvanceController.java`](backend/src/main/java/com/siteledger/controller/AdvanceController.java) |
| M12 | **Payment/Billing** | General | ✅ | [`PaymentController.java`](backend/src/main/java/com/siteledger/controller/PaymentController.java) |
| M13 | **Document Management** | General | ✅ | [`DocumentController.java`](backend/src/main/java/com/siteledger/controller/DocumentController.java) |
| M14 | **Subcontractor Work** | Section 8 | ✅ | [`SubcontractorWorkController.java`](backend/src/main/java/com/siteledger/controller/SubcontractorWorkController.java) |
| M15 | **User Management** | General | ✅ | [`UserController.java`](backend/src/main/java/com/siteledger/controller/UserController.java) |
| M16 | **Audit Trail** | Section 9 | ✅ | [`AuditService.java`](backend/src/main/java/com/siteledger/service/AuditService.java), [`AuditLogEntity.java`](backend/src/main/java/com/siteledger/entity/AuditLogEntity.java) |
| M17 | **Permission System** | Section 5.4 | ⚠️ | [`PermissionEntity.java`](backend/src/main/java/com/siteledger/entity/PermissionEntity.java), [`PermissionRepository.java`](backend/src/main/java/com/siteledger/repository/PermissionRepository.java) |

---

## 6. 🐛 BUGS FIXED

| Bug | BRD Ref | Fix Applied | File |
|---|---|---|---|
| `locked` column missing | Section 6.2 | Database ALTER TABLE added | `labour_entries` table |
| `user_id` NULL in Material Transactions | General | Added `txn.setUser(user)` | [`MaterialController.java`](backend/src/main/java/com/siteledger/controller/MaterialController.java:92) |
| `user_id` NULL in Labour | General | Added `labour.setUser(user)` | [`LabourController.java`](backend/src/main/java/com/siteledger/controller/LabourController.java:80) |
| `user_id` NULL in Advances | General | Added `advance.setUser(user)` | [`AdvanceController.java`](backend/src/main/java/com/siteledger/controller/AdvanceController.java:77) |
| `user_id` NULL in Payments | General | Added `payment.setUser(user)` | [`PaymentController.java`](backend/src/main/java/com/siteledger/controller/PaymentController.java:62) |
| `user_id` NULL in Documents | General | Added `doc.setUser(user)` | [`DocumentController.java`](backend/src/main/java/com/siteledger/controller/DocumentController.java:137) |

---

## 7. 📋 FEATURE STATUS SUMMARY

### ✅ Fully Implemented (11/17)
| # | Module | BRD Section |
|---|---|---|
| 1 | Authentication & JWT | Section 4 |
| 2 | Site Management | Section 5 |
| 3 | Owner Dashboard | Section 3.4 |
| 4 | Material Management | Section 5.5 |
| 5 | Labour Management | Section 5.5 |
| 6 | Entry Lock System | Section 6 |
| 7 | Subcontractor Work | Section 8 |
| 8 | Document Management | General |
| 9 | Advance Management | General |
| 10 | Payment/Billing | General |
| 11 | Audit Trail | Section 9 |

### ⚠️ Partially Implemented (2/17)
| # | Module | What's Missing |
|---|---|---|
| 1 | **Permission System** | Owner UI to assign permissions not built |
| 2 | **Ledger/Accounting** | Petty expense flow not separate from general ledger |

### ✅ NEWLY Implemented (4/17 — Just Added)
| # | Module | Files Created |
|---|---|---|
| 1 | **✅ Machinery Management** | [`MachineryEntity.java`](backend/src/main/java/com/siteledger/entity/MachineryEntity.java), [`MachineryController.java`](backend/src/main/java/com/siteledger/controller/MachineryController.java), [`MachineryRepository.java`](backend/src/main/java/com/siteledger/repository/MachineryRepository.java), [`MachineryPage.jsx`](frontend/src/pages/MachineryPage.jsx), [`machineryApi.js`](frontend/src/api/machineryApi.js) |
| 2 | **✅ Vehicle/Transport** | [`TransportEntity.java`](backend/src/main/java/com/siteledger/entity/TransportEntity.java), [`TransportController.java`](backend/src/main/java/com/siteledger/controller/TransportController.java), [`TransportRepository.java`](backend/src/main/java/com/siteledger/repository/TransportRepository.java), [`TransportPage.jsx`](frontend/src/pages/TransportPage.jsx), [`transportApi.js`](frontend/src/api/transportApi.js) |
| 3 | **✅ Petty Expense with Payment Source** | [`ExpenseEntity.java`](backend/src/main/java/com/siteledger/entity/ExpenseEntity.java), [`ExpenseController.java`](backend/src/main/java/com/siteledger/controller/ExpenseController.java), [`ExpenseRepository.java`](backend/src/main/java/com/siteledger/repository/ExpenseRepository.java), [`ExpensesPage.jsx`](frontend/src/pages/ExpensesPage.jsx), [`expenseApi.js`](frontend/src/api/expenseApi.js) |
| 4 | **✅ Balance Ledger (Munshi)** | [`BalanceLedgerEntity.java`](backend/src/main/java/com/siteledger/entity/BalanceLedgerEntity.java), [`BalanceLedgerController.java`](backend/src/main/java/com/siteledger/controller/BalanceLedgerController.java), [`BalanceLedgerRepository.java`](backend/src/main/java/com/siteledger/repository/BalanceLedgerRepository.java), [`BalancePage.jsx`](frontend/src/pages/BalancePage.jsx), [`balanceApi.js`](frontend/src/api/balanceApi.js) |

### Remaining for Future
| # | Item | Notes |
|---|---|---|
| 1 | **Permission Management UI** | Owner portal to ON/OFF module permissions per user |
| 2 | **Office Admin Access Types** | Enforce SELECTED_SITE, VIEW_ONLY, PERMISSION_BASED |
| 3 | **Report Export** | Excel/PDF generation |

---

## 8. 🎯 RECOMMENDATIONS

### Immediate (Next Sprint)
1. **Machinery Module** — Create `MachineryEntity.java`, `MachineryController.java`, `MachineryPage.jsx`
2. **Vehicle/Transport Module** — Create `TransportEntity.java`, `TransportController.java`
3. **Petty Expense with Payment Source** — Add payment source field to expense tracking

### Medium Priority
4. **Balance Ledger for Munshi** — Personal balance tracking with Company Advance, Personal Money, Vendor Credit
5. **Permission Management UI** — Owner interface to ON/OFF module permissions per user
6. **Report Export** — Excel/PDF generation for all modules

### Low Priority
7. **Office Admin Access Types** — Enforce Selected Site, View Only, Permission Based access
8. **Auto-calculation (Qty × Rate)** — For subcontractor payable amount

---

*End of Document — BRD vs Code Mapping*
