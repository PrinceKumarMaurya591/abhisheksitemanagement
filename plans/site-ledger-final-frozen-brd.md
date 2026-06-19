# 🏗️ Site Ledger — Final System Structure (Frozen)

**Document Version:** 3.0 (Final Freeze)  
**Based On:** Client's Final Requirements  
**Platform:** Web + Mobile (Android) — React 19 + Spring Boot 3.2.5 + PostgreSQL 16  
**Last Updated:** 19-Jun-2026

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [User Roles & Hierarchy](#2-user-roles--hierarchy)
3. [Three Parallel Ledgers (Core Concept)](#3-three-parallel-ledgers-core-concept)
4. [ADMIN (OWNER) Module](#4-admin-owner-module)
5. [OFFICE Module](#5-office-module)
6. [MUNSHI Module](#6-munshi-module)
7. [SITE INCHARGE Module](#7-site-incharge-module)
8. [Material System (Final)](#8-material-system-final)
9. [Labour Module (Final Freeze)](#9-labour-module-final-freeze)
10. [Site Dashboard & Tabs](#10-site-dashboard--tabs)
11. [Project Add Form](#11-project-add-form)
12. [Archive System](#12-archive-system)
13. [Notification System](#13-notification-system)
14. [Voice Entry](#14-voice-entry)
15. [Offline Mode](#15-offline-mode)
16. [Auto Backup](#16-auto-backup)
17. [Audit Log](#17-audit-log)
18. [Module-Wise Access Matrix](#18-module-wise-access-matrix)
19. [Data Model](#19-data-model)
20. [Implementation Phases](#20-implementation-phases)

---

## 1. System Architecture

```
                        👑 ADMIN (OWNER)
                               │
                    ┌──────────┴──────────┐
                    │                     │
              🏢 OFFICE                   │
         (Monitoring, Verification,       │
          Corrections, Reports,           │
          Notifications)                  │
                    │                     │
         ┌──────────┴──────────┐          │
         │                     │          │
   🧾 MUNSHI            👷 SITE INCHARGE │
   (Material Entry,     (Assigned Sites,  │
    Consumption Entry,   Material,        │
    Attendance,          Labour,          │
    Daily Expenses,      Expenses,        │
    Voice Entry)         Documents,       │
          │              Photos,          │
          │              5-Day Window)    │
          └──────────┬──────────┘         │
                     │                    │
               🔧 SUBCONTRACTOR           │
                     │                    │
                     └────────────────────┘
```

### 1.1 Role Summary

| Role | Level | Description |
|------|-------|-------------|
| 👑 **ADMIN (OWNER)** | Level 1 | Full system control. User Management, Site Management, Finance, Reports, P/L, Archive, Documents |
| 🏢 **OFFICE** | Level 2 | Monitoring, Verification, Corrections, Reports, Notifications |
| 🧾 **MUNSHI** | Level 3 | Data entry: Material, Consumption, Attendance, Daily Expenses, Voice Entry. 24-hr view only, no edit/delete after entry |
| 👷 **SITE INCHARGE** | Level 3 | Assigned Sites, Material, Labour, Expenses, Documents, Photos. 5-day edit window, no delete |
| 🔧 **SUBCONTRACTOR** | Level 4 | Own work only. Quantity, Rate, Payment Status |

---

## 2. User Roles & Hierarchy

### 2.1 Role Enum

```java
public enum Role {
    OWNER,              // ADMIN - Full system control
    OFFICE_ADMIN,       // OFFICE - Configurable monitoring access
    SITE_INCHARGE,      // Site chief - 5-day edit window
    MUNSHI,             // Data entry - 24-hr view only
    MATE,               // Field assistant - 24-hr view only
    SUBCONTRACTOR,      // Third party worker - own work only
    SUBCONTRACTOR_ADMIN // Manages subcontractors
}
```

### 2.2 Permission Model

- **OWNER**: Full access to everything. No permission checks apply.
- **OFFICE_ADMIN**: Configurable access via `accessType` field (FULL_ACCESS, SELECTED_SITE, VIEW_ONLY, PERMISSION_BASED) + module-level permissions.
- **SITE_INCHARGE/MUNSHI/MATE**: Permission-based via `PermissionEntity`. Owner/Office can ON/OFF individual modules.
- **SUBCONTRACTOR/SUBCONTRACTOR_ADMIN**: Restricted to own work only.

### 2.3 Time-Based Access Control

| Role | View Window | Edit Window | Delete |
|------|------------|-------------|--------|
| **OWNER** | Unlimited | Unlimited | ✅ |
| **OFFICE_ADMIN** | Unlimited | Unlimited | ✅ |
| **SITE_INCHARGE** | 5 days from creation | 5 days from creation | ❌ |
| **MUNSHI** | 24 hours from creation | ❌ Never | ❌ |
| **MATE** | 24 hours from creation | ❌ Never | ❌ |

---

## 3. Three Parallel Ledgers (Core Concept)

This is the most important concept in the system. Three independent ledgers run in parallel, each serving a different purpose.

### 3.1 Site Ledger

Tracks total expense at the **site level**. Every expense category is tracked and drillable.

```
Site: Road Project-A

┌─────────────────────────────────────┐
│          SITE LEDGER                 │
├──────────────────┬──────────────────┤
│ Material         │ ₹10,00,000       │  ← Click to see date/vendor/qty details
│ Labour           │ ₹4,00,000        │  ← Click to see daily breakdown
│ Transport        │ ₹1,50,000        │
│ Diesel           │ ₹80,000          │
│ Water            │ ₹30,000          │
├──────────────────┼──────────────────┤
│ Total Expense    │ ₹16,60,000       │
└──────────────────┴──────────────────┘
```

**Drill-down behavior**:
- Click "Material" → See list: Date, Vendor Name, Material Name, Quantity, Amount
- Click "Labour" → See list: Date, Labour Count, Category, Amount
- Click "Transport" → See list: Date, Vehicle, Trips, Quantity, Rate, Amount

### 3.2 User Cash Ledger (Site-Wise)

Tracks how much money was given to each staff member **per site**.

```
Mohan (Site Incharge)
┌─────────────────────────────────────┐
│    Site: Road Project-A             │
├──────────────────┬──────────────────┤
│ Received         │ ₹50,000          │
│ Spent            │ ₹42,000          │
│ Balance          │ ₹8,000           │
├──────────────────┴──────────────────┤
│    Site: Bridge Project-B           │
├──────────────────┬──────────────────┤
│ Received         │ ₹1,00,000        │
│ Spent            │ ₹75,000          │
│ Balance          │ ₹25,000          │
└──────────────────┴──────────────────┘
```

**Key Rules**:
- Cash ledger is **site-wise**: If Mohan has 3 sites, show 3 separate ledgers
- Staff expenses auto-add to Site Ledger for final expense calculation
- Admin portal shows all staff + all sites in one view
- Admin can click a staff name → see which sites they have, how much received/spent/balance per site

### 3.3 Department Payment Ledger

Tracks payments received from the department/client against contract value.

```
┌─────────────────────────────────────┐
│    DEPARTMENT PAYMENT LEDGER         │
├──────────────────────┬──────────────┤
│ Contract Value       │ ₹1,20,00,000 │
│ Received             │ ₹80,00,000   │
│ Pending              │ ₹40,00,000   │
└──────────────────────┴──────────────┘
```

### 3.4 Ledger Relationships

```
Staff Expense Entry
       │
       ├──→ Updates User Cash Ledger (staff's balance decreases)
       │
       └──→ Updates Site Ledger (site's total expense increases)

Payment Received from Department
       │
       └──→ Updates Department Payment Ledger

Advance Given to Staff
       │
       ├──→ Updates User Cash Ledger (staff's received increases)
       │
       └──→ Updates Site Ledger (as DEBIT entry)
```

---

## 4. ADMIN (OWNER) Module

### 4.1 Features

| Feature | Description |
|---------|-------------|
| **User Management** | Create, edit, suspend, delete users. Assign roles and permissions |
| **Site Management** | Create, edit, update status (Active/Completed/On Hold/Cancelled/Archive). Assign staff to sites |
| **Finance Control** | Full access to all financial data: Ledger, Advances, Payments, Balance |
| **Reports** | Exportable reports with charts, site-wise profit/loss, expense breakdown |
| **Profit/Loss** | Overall P/L dashboard. Site-wise P/L breakdown |
| **Archive Sites** | Soft-delete sites. Permanent delete only after Password + OTP + Confirmation |
| **Documents** | Upload, view, download, delete all documents across all sites |
| **Full Control** | Can edit/delete any entry across all modules |

### 4.2 Owner Dashboard KPIs

```
┌──────────┬──────────┬──────────┬──────────────┐
│ Total    │ Running  │Completed │ Contract      │
│ Sites    │ Sites    │ Sites    │ Value         │
├──────────┼──────────┼──────────┼──────────────┤
│ Received │ Expense  │ Pending  │ Outstanding   │
│          │          │          │ Advances      │
├──────────┴──────────┴──────────┴──────────────┤
│ Overall Profit / Loss: ₹XX,XXX (Profit/Loss)   │
├───────────────────────────────────────────────┤
│ Expense Breakdown: Material / Labour / Other    │
│ Charts: Pie + Bar                              │
└───────────────────────────────────────────────┘
```

---

## 5. OFFICE Module

### 5.1 Features

| Feature | Description |
|---------|-------------|
| **Monitoring** | View all sites, dashboards, KPIs. Real-time monitoring of field activity |
| **Verification** | Verify field entries. Mark entries as verified/unverified. Queue of pending verifications |
| **Corrections** | Systematic correction workflow: View original entry → Make correction → Log reason → Audit trail |
| **Reports** | Generate and export site reports, financial summaries |
| **Notifications** | Receive alerts for: No site updates in 48 hours, Low cash balance, Low stock |

### 5.2 Verification Workflow

```
Field Staff creates entry
       │
       ▼
Entry marked as "Pending Verification"
       │
       ▼
Office reviews entry in Verification Queue
       │
       ├──→ Approve → Entry marked as "Verified"
       │
       └──→ Request Correction → Staff/Admin corrects
```

---

## 6. MUNSHI Module

### 6.1 Features

| Feature | Description |
|---------|-------------|
| **Material Entry** | Record material arrival: Name, Quantity, Unit, Vendor, Vehicle, Date, Photo |
| **Consumption Entry** | Record material shift from yard to site. Track transport medium + expense. E.g., "Tractor GSB 2 trail gaya, Rate 600, per trail GSB 100 Cum" → calculates transport cost + material consumption |
| **Attendance** | Daily A/P attendance for registered labourers. Simple checkbox interface |
| **Daily Expenses** | Petty cash expenses: Water, Tea, Tools, Diesel, Misc with payment source |
| **Voice Entry** | Speech-to-text for fast data entry. "Aaj 30 bag cement aaya 12000 rupaye ka" → auto-fills form |
| **24 Hr View Only** | Once entry is saved, it locks immediately. No edit, no delete. Only viewable for 24 hours |

### 6.2 Material Consumption with Transport Tracking

This is a critical feature. When bulk material moves from dump yard to site via a transport medium (tractor, truck, etc.):

```
Example: Tractor carrying GSB
- 2 trips (trail)
- Rate: ₹600 per trip
- Per trip: 100 Cum GSB

Calculations:
  Transport Cost = 2 × ₹600 = ₹1,200
  Material Consumed = 2 × 100 = 200 Cum

Both values are tracked simultaneously.
```

---

## 7. SITE INCHARGE Module

### 7.1 Features

| Feature | Description |
|---------|-------------|
| **Assigned Sites** | View only assigned sites with dashboard KPIs |
| **Material** | View and add material entries (if permitted) |
| **Labour** | View and add labour entries (if permitted) |
| **Expenses** | View and add expense entries (if permitted) |
| **Documents** | View and upload documents |
| **Photos** | Upload site photos |
| **5 Day Edit Window** | Can edit own entries within 5 days. Cannot delete any entry |

---

## 8. Material System (Final)

### 8.1 Material Classification

Materials are divided into two types:

#### Stock Material
```
Cement, Steel, Pipe, Brick, Bitumen, etc.
→ Stock is maintained (purchased - consumed = balance)
→ Full inventory tracking
```

#### Bulk Material
```
GSB, WMM, Sand, Morrum, Earth Filling, White Sand, etc.
→ Direct consumption from dump yard to site
→ No stock maintained
→ Transport medium tracking is critical
```

### 8.2 Flow

```
                    ┌─────────────────┐
                    │   Dump Yard      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Road Site      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Direct Consumption│
                    │ (No Stock Held)   │
                    └─────────────────┘
```

### 8.3 Shifting with Transport Tracking

When material shifts from yard to site via transport:

```
Input Fields:
┌─────────────────────────────────────┐
│ Material: GSB                        │
│ Transport Mode: Tractor              │
│ Trips (Trail): 2                     │
│ Rate per Trip: ₹600                  │
│ Quantity per Trip: 100 Cum           │
├─────────────────────────────────────┤
│ Auto-Calculated:                     │
│ Total Quantity: 200 Cum             │
│ Transport Cost: ₹1,200              │
└─────────────────────────────────────┘
```

---

## 9. Labour Module (Final Freeze)

### 9.1 Labour Registration (One-Time)

When a new labourer is added:

```
┌─────────────────────────────────────┐
│        LABOUR REGISTRATION           │
├─────────────────────────────────────┤
│ 📷 Photo                             │
│ Name: _____________                  │
│ Father Name: _____________           │
│ Mobile: _____________                │
│ Category: [Dropdown]                 │
│ Rate Per Day: ₹_____                 │
│ Joining Date: ________               │
│ Status: ● Active / ○ Inactive        │
└─────────────────────────────────────┘
```

**Categories**: Labour, Mistri, Helper, Welder, Electrician, Plumber, Driver, Machine Operator, Carpenter, Painter, Other

### 9.2 Daily Attendance

Munshi's screen shows a simple A/P interface:

```
Date: 18-Jun-2026

┌─────────────────────────────────────┐
│ Labour Name          │ A │ P │      │
├──────────────────────┼───┼───┤      │
│ Ram Prasad           │ ✓ │   │      │
│ Shyam                │ ✓ │   │      │
│ Mohan                │   │ ✓ │      │
│ Rakesh               │ ✓ │   │      │
└─────────────────────────────────────┘
```

- Only A (Present) or P (Absent)
- No other entry required
- Inactive labourers don't appear in attendance list

### 9.3 Auto Wage Calculation

```
Ram Prasad
Rate: ₹900/day
Present: 22 Days

System Auto-Calculates:
22 × ₹900 = ₹19,800
```

### 9.4 Monthly Wage Sheet

```
┌─────────────────────────────────────┐
│        MONTHLY WAGE SHEET            │
├──────────────────────┬──────────────┤
│ Labourer             │ Ram Prasad   │
│ Present Days         │ 22           │
│ Absent Days          │ 4            │
│ Rate                 │ ₹900/day     │
│ Gross Wage           │ ₹19,800      │
│ Advance Deduction    │ ₹5,000       │
│ Net Payable          │ ₹14,800      │
└──────────────────────┴──────────────┘
```

### 9.5 Advance Adjustment

If labour was given an advance:

```
Gross Wage: ₹19,800
Advance:    ₹5,000
Payable:    ₹14,800
```

### 9.6 Labour Payment Entry

```
┌─────────────────────────────────────┐
│        LABOUR PAYMENT                │
├─────────────────────────────────────┤
│ Labourer: Ram Prasad                 │
│ Amount: ₹14,800                      │
│ Mode: ● Cash / ○ Bank Transfer       │
│ Date: ______________                 │
└─────────────────────────────────────┘
```

On payment:
- Labour expense +₹14,800 auto-added to Site Ledger

### 9.7 Labour Dashboard

```
┌─────────────────────────────────────┐
│        LABOUR DASHBOARD              │
├─────────────────────────────────────┤
│ Total Labour          │ 45          │
│ Present Today         │ 38          │
│ Absent Today          │ 7           │
│ Current Month Cost    │ ₹5,45,000   │
└─────────────────────────────────────┘
```

### 9.8 Active/Inactive Status

- **Active**: Shows in attendance list, can mark A/P
- **Inactive**: History preserved, hidden from attendance list
- No delete needed

### 9.9 Final Flow

```
New Labour Added (Registration)
       │
       ▼
Daily A/P Attendance
       │
       ▼
Auto Wage Calculation (Rate × Present Days)
       │
       ▼
Advance Deduction (if any)
       │
       ▼
Payment Entry (Cash/Bank)
       │
       ▼
Auto-Add to Site Labour Expense
```

---

## 10. Site Dashboard & Tabs

### 10.1 Site Dashboard (Must Show on Open)

When a site is opened, the following must be prominently displayed:

```
┌─────────────────────────────────────────────┐
│     SITE DASHBOARD — Road Project-A          │
├─────────────────────────────────────────────┤
│                                             │
│  Contract Value     ₹1,20,00,000            │
│                                             │
│  Received           ₹80,00,000              │
│                                             │
│  Expense            ₹65,00,000              │
│                                             │
│  Profit             ₹15,00,000              │
│                                             │
│  Pending            ₹40,00,000              │
│                                             │
│  Progress           ████████████░░ 72%      │
│                                             │
└─────────────────────────────────────────────┘
```

**Progress %** = (Total Received / Contract Value) × 100

### 10.2 Site Detail Tabs

Each site has the following tabs:

| # | Tab | Description |
|---|-----|-------------|
| 1 | **Dashboard** | KPIs, charts, progress bar |
| 2 | **Expenses** | All expense entries, categorized |
| 3 | **Material** | Stock materials with inventory tracking |
| 4 | **Material Shifting** | Yard-to-site consumption with transport tracking |
| 5 | **Labour** | Labour registration, attendance, wage, payment |
| 6 | **Photos** | Site photos gallery |
| 7 | **Documents** | All documents (Tender, DPR, BOQ, Bills) |
| 8 | **Payments** | Department payments received |
| 9 | **Cash Ledger** | Site-wise user cash ledger for assigned staff |
| 10 | **Reports** | Exportable reports |

---

## 11. Project Add Form

When adding a new project/site, the following fields are required:

```
┌─────────────────────────────────────────────┐
│           ADD NEW PROJECT                    │
├─────────────────────────────────────────────┤
│                                              │
│  1. Work Name: _____________                 │
│                                              │
│  2. Department: _____________                │
│                                              │
│  3. Yojna (Scheme): [Dropdown/Type]          │
│     (e.g., Jal Nikasi, Pt. Deen Dayal        │
│      Upadhyay Yojana, SCSP Yojana)           │
│     → User types their own, not suggestions  │
│                                              │
│  4. Project Value: ₹_______________          │
│                                              │
│  5. Start Date: ________                     │
│     End Date:   ________                     │
│                                              │
│  6. Documents (Upload):                      │
│     □ Tender Notice                          │
│     □ DPR (Detailed Project Report)          │
│     □ BOQ (Bill of Quantities)               │
│                                              │
│  7. District: _____________                  │
│                                              │
├─────────────────────────────────────────────┤
│  [SAVE]  [CANCEL]                            │
│                                              │
│  Note: Admin can edit all fields later.      │
└─────────────────────────────────────────────┘
```

---

## 12. Archive System

### 12.1 Site Lifecycle

```
Running (ACTIVE)
    │
    ▼
Completed (COMPLETED)
    │
    ▼
Archive (ARCHIVED)
    │
    ▼
Permanent Delete
    • Password Required
    • OTP Verification
    • Confirmation Dialog
```

### 12.2 Permanent Delete Security

Permanent delete requires **three-step verification**:
1. **Password** — Admin must enter their password
2. **OTP** — OTP sent to registered mobile/email
3. **Confirmation** — "Are you sure? This action cannot be undone."

---

## 13. Notification System

### 13.1 No Update Alert

```
┌─────────────────────────────────────┐
│  ⚠️ NO UPDATE ALERT                 │
├─────────────────────────────────────┤
│  Site: Road Project-A                │
│  No Update Since: 48 Hours           │
│  Last Entry: 16-Jun-2026             │
│                                       │
│  → Notify: OFFICE                    │
└─────────────────────────────────────┘
```

### 13.2 Low Cash Alert

```
┌─────────────────────────────────────┐
│  ⚠️ LOW CASH ALERT                   │
├─────────────────────────────────────┤
│  Munshi: Rajesh                     │
│  Site: Road Project-A               │
│  Current Balance: ₹2,000            │
│                                       │
│  → Threshold: ₹5,000                │
└─────────────────────────────────────┘
```

### 13.3 Low Stock Alert

```
┌─────────────────────────────────────┐
│  ⚠️ LOW STOCK ALERT                  │
├─────────────────────────────────────┤
│  Material: Cement                   │
│  Site: Road Project-A               │
│  Remaining: 15 Bags                 │
│                                       │
│  → Threshold: 20 Bags               │
└─────────────────────────────────────┘
```

---

## 14. Voice Entry

### 14.1 Auto-Fill from Speech

Munshi speaks naturally:

> "Aaj 30 bag cement aaya 12000 rupaye ka"

System automatically fills:

```
Material: Cement
Quantity: 30
Unit: Bags
Amount: ₹12,000
```

### 14.2 Voice-to-Text in Description

- Voice input available in all text description fields
- Uses Web Speech API (browser) / Android SpeechRecognizer (native)

---

## 15. Offline Mode

### 15.1 Requirement

- App must work in areas with no network connectivity (villages, remote sites)
- Data entry should work fully offline
- Auto-sync when network becomes available

### 15.2 Implementation Approach

```
┌─────────────────────────────────────────────┐
│           OFFLINE ARCHITECTURE               │
├─────────────────────────────────────────────┤
│                                             │
│  Online Mode:                                │
│  App ↔ API ↔ Database                        │
│                                             │
│  Offline Mode:                               │
│  App ↔ IndexedDB (Local)                     │
│       ↓ (When network available)             │
│  Sync Service ↔ API ↔ Database               │
│                                             │
└─────────────────────────────────────────────┘
```

- PWA (Progressive Web App) with Service Worker
- IndexedDB for local data storage
- Queue-based sync for offline mutations
- Conflict resolution strategy

---

## 16. Auto Backup

### 16.1 Schedule

```
Daily at 12:00 AM (Midnight)
→ Automated Cloud Backup
→ No manual intervention required
```

### 16.2 Backup Scope

- Full database backup
- All uploaded documents and photos
- Backup to cloud storage (AWS S3 / Google Cloud Storage)

---

## 17. Audit Log

### 17.1 Requirement

Every change must be recorded:

```
┌─────────────────────────────────────────────┐
│              AUDIT LOG                       │
├─────────────────────────────────────────────┤
│                                             │
│  User: Rajesh                               │
│  Action: Changed Expense                    │
│  Field: Amount                              │
│  Old Value: ₹5,000                         │
│  New Value: ₹5,500                         │
│  Date: 18-Jun-2026                         │
│  Time: 14:30:25                             │
│                                             │
│  → Main ledger also updates to reflect      │
│    actual cost for the site                 │
│                                             │
└─────────────────────────────────────────────┘
```

### 17.2 Key Principle

> You should ALWAYS know who changed what and when.

---

## 18. Module-Wise Access Matrix

| Module | ADMIN (OWNER) | OFFICE | SITE INCHARGE | MUNSHI | SUBCONTRACTOR |
|--------|:---:|:---:|:---:|:---:|:---:|
| **Owner Dashboard** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Site Dashboard (Full)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Site Dashboard (Limited)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sites — All** | ✅ | ✅ Config | ✅ Assigned | ✅ Assigned | ✅ Assigned |
| **Sites — Create/Edit** | ✅ | ✅ Config | ❌ | ❌ | ❌ |
| **Site Ledger** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Materials — Stock** | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ |
| **Materials — Bulk/Shifting** | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ |
| **Labour — Registration** | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ |
| **Labour — Attendance** | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ |
| **Labour — Wage/Payment** | ✅ | ✅ | ✅ (If Perm) | ❌ | ❌ |
| **Expenses** | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ |
| **Machinery** | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ |
| **Transport** | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ |
| **User Cash Ledger** | ✅ All | ✅ All | ✅ Own | ✅ Own | ❌ |
| **Department Payment Ledger** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Advances** | ✅ Full | ✅ Config | ❌ | ❌ | ❌ |
| **Payments** | ✅ Full | ✅ Config | ❌ | ❌ | ❌ |
| **Documents** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Photos** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Subcontractor Work** | ✅ All | ✅ All | ❌ | ❌ | ✅ Own |
| **Users — View** | ✅ All | ✅ | ❌ | ❌ | ❌ |
| **Users — Create/Edit** | ✅ All | ❌ | ❌ | ❌ | ❌ |
| **Reports** | ✅ Full | ✅ Config | ❌ | ❌ | ❌ |
| **Notifications** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ Full | ✅ | ❌ | ❌ | ❌ |
| **Voice Entry** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Offline Mode** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 19. Data Model

### 19.1 New/Modified Entities

#### SiteEntity (Enhanced)

```java
@Entity
@Table(name = "sites")
public class SiteEntity {
    Long id;
    String siteName;
    String department;
    String workName;
    
    @ManyToOne
    YojnaEntity yojna;           // Scheme/Nikay
    
    BigDecimal contractValue;     // Project Value
    String workOrderNumber;
    LocalDate startDate;
    LocalDate endDate;
    String district;              // NEW
    
    SiteStatus status;            // ACTIVE, COMPLETED, ON_HOLD, CANCELLED, ARCHIVED
    
    @ManyToMany
    Set<UserEntity> assignedStaff;
    
    String address;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

#### LabourRegistrationEntity (NEW)

```java
@Entity
@Table(name = "labour_registrations")
public class LabourRegistrationEntity {
    Long id;
    String photoPath;
    String name;
    String fatherName;
    String mobile;
    String category;       // Mistri, Helper, Welder, etc.
    BigDecimal ratePerDay;
    LocalDate joiningDate;
    LabourStatus status;   // ACTIVE, INACTIVE
    Long siteId;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

#### LabourAttendanceEntity (NEW)

```java
@Entity
@Table(name = "labour_attendance")
public class LabourAttendanceEntity {
    Long id;
    Long labourRegistrationId;
    Long siteId;
    LocalDate date;
    boolean present;       // true = Present, false = Absent
    String markedBy;       // username who marked
    LocalDateTime createdAt;
}
```

#### LabourPaymentEntity (NEW)

```java
@Entity
@Table(name = "labour_payments")
public class LabourPaymentEntity {
    Long id;
    Long labourRegistrationId;
    Long siteId;
    BigDecimal grossWage;
    BigDecimal advanceDeduction;
    BigDecimal netPayable;
    BigDecimal paidAmount;
    String paymentMode;    // CASH, BANK_TRANSFER
    LocalDate paymentDate;
    String createdBy;
    LocalDateTime createdAt;
}
```

#### MaterialShiftingEntity (NEW — Yard to Site)

```java
@Entity
@Table(name = "material_shifting")
public class MaterialShiftingEntity {
    Long id;
    String materialName;
    String materialType;   // STOCK, BULK
    Long fromSiteId;       // Dump yard
    Long toSiteId;         // Road site
    String transportMode;  // Tractor, Truck, Dumper
    Integer trips;         // Number of trips
    BigDecimal ratePerTrip;
    BigDecimal quantityPerTrip;
    BigDecimal totalQuantity;   // Auto: trips × quantityPerTrip
    BigDecimal totalTransportCost; // Auto: trips × ratePerTrip
    LocalDate date;
    String createdBy;
    LocalDateTime createdAt;
}
```

### 19.2 ER Diagram

```
┌──────────────────┐       ┌────────────────────┐
│     yojnas       │       │      sites          │
├──────────────────┤       ├────────────────────┤
│ id (PK)          │◄──────┤ yojna_id (FK)      │
│ yojna_name       │ 1:N   │ id (PK)            │
│ ...              │       │ site_name          │
└──────────────────┘       │ department         │
                           │ work_name          │
┌──────────────────┐       │ contract_value     │
│    users         │       │ district (NEW)     │
├──────────────────┤       │ status             │
│ id (PK)          │       │ ...                │
│ username         │       └────────┬───────────┘
│ password         │                │
│ role (ENUM)      │                │ M:N
│ access_type      │   ┌────────────┴───────────────┐
│ assigned_site_ids│   │ site_assigned_staff         │
│ ...              │   ├────────────────────────────┤
└──────────────────┘   │ site_id (FK)               │
        │              │ user_id (FK)               │
        │              └────────────────────────────┘
        │
        │ 1:N           ┌────────────────────────────┐
        ├───────────────│ labour_registrations (NEW)  │
        │               ├────────────────────────────┤
        │               │ id (PK)                    │
        │               │ name, father_name, mobile   │
        │               │ category, rate_per_day      │
        │               │ photo_path, status          │
        │               │ site_id (FK)                │
        │               └────────────────────────────┘
        │                           │ 1:N
        │               ┌────────────────────────────┐
        │               │ labour_attendance (NEW)     │
        │               ├────────────────────────────┤
        │               │ id (PK)                    │
        │               │ labour_registration_id (FK) │
        │               │ date, present               │
        │               └────────────────────────────┘
        │
        │               ┌────────────────────────────┐
        ├───────────────│ material_shifting (NEW)     │
        │               ├────────────────────────────┤
        │               │ id (PK)                    │
        │               │ material_name, material_type│
        │               │ transport_mode, trips       │
        │               │ rate_per_trip               │
        │               │ quantity_per_trip           │
        │               │ total_quantity (auto)       │
        │               │ total_cost (auto)           │
        │               │ from_site_id (FK)           │
        │               │ to_site_id (FK)             │
        └───────────────└────────────────────────────┘
```

---

## 20. Implementation Phases

### Phase 1: Foundation (Week 1-2)
| # | Task | Priority |
|---|------|----------|
| 1.1 | Add `district` field to SiteEntity | 🔴 High |
| 1.2 | Add document upload to site creation form | 🔴 High |
| 1.3 | Add site-wise filtering to User Cash Ledger | 🔴 High |
| 1.4 | Add SITE_INCHARGE expense permission to DataSeeder | 🔴 High |
| 1.5 | Add Progress % to Site Dashboard | 🔴 High |
| 1.6 | Restructure SiteDetailPage into tabbed layout | 🔴 High |

### Phase 2: Labour Module Rework (Week 2-4)
| # | Task | Priority |
|---|------|----------|
| 2.1 | Create LabourRegistrationEntity + Repository + Controller | 🔴 High |
| 2.2 | Create LabourAttendanceEntity + Repository + Controller | 🔴 High |
| 2.3 | Create LabourPaymentEntity + Repository + Controller | 🔴 High |
| 2.4 | Create Labour dashboard service (auto wage calc, monthly sheet) | 🔴 High |
| 2.5 | Frontend: Labour Registration page with photo upload | 🔴 High |
| 2.6 | Frontend: Daily Attendance A/P interface | 🔴 High |
| 2.7 | Frontend: Monthly Wage Sheet | 🔴 High |
| 2.8 | Frontend: Labour Payment Entry | 🔴 High |
| 2.9 | Frontend: Labour Dashboard | 🔴 High |
| 2.10 | Auto-add labour expense to Site Ledger on payment | 🔴 High |

### Phase 3: Material System Enhancement (Week 3-4)
| # | Task | Priority |
|---|------|----------|
| 3.1 | Add `materialType` (STOCK/BULK) to MaterialEntity | 🔴 High |
| 3.2 | Create MaterialShiftingEntity with transport tracking | 🔴 High |
| 3.3 | Frontend: Material Shifting form | 🔴 High |
| 3.4 | Auto-calculate transport cost + material consumption | 🔴 High |

### Phase 4: Notifications + Voice (Week 4-5)
| # | Task | Priority |
|---|------|----------|
| 4.1 | Create NotificationService with alert types | 🟡 Medium |
| 4.2 | Implement No-Update Alert (48-hour check) | 🟡 Medium |
| 4.3 | Implement Low Cash Alert | 🟡 Medium |
| 4.4 | Implement Low Stock Alert | 🟡 Medium |
| 4.5 | Voice Entry: Speech-to-text auto-fill | 🟡 Medium |
| 4.6 | Voice Entry: Voice-to-text in description fields | 🟡 Medium |

### Phase 5: Verification + Correction Workflows (Week 5-6)
| # | Task | Priority |
|---|------|----------|
| 5.1 | Add `verified` field to entry entities | 🟡 Medium |
| 5.2 | Create Verification Queue page for Office | 🟡 Medium |
| 5.3 | Create Correction Workflow UI | 🟡 Medium |
| 5.4 | Reports Page with PDF/Excel export | 🟡 Medium |

### Phase 6: Archive + Security (Week 6)
| # | Task | Priority |
|---|------|----------|
| 6.1 | Permanent Delete flow with Password + OTP | 🟡 Medium |
| 6.2 | Archive Sites dedicated page | 🟡 Medium |

### Phase 7: Offline + Backup (Week 6-8)
| # | Task | Priority |
|---|------|----------|
| 7.1 | PWA setup with Service Worker | 🟢 Low |
| 7.2 | IndexedDB for local data storage | 🟢 Low |
| 7.3 | Offline sync queue | 🟢 Low |
| 7.4 | Auto Backup scheduler | 🟢 Low |

---

## Appendices

### A. Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| `owner` | `owner123` | 👑 ADMIN (OWNER) |
| `admin` | `admin123` | 🏢 OFFICE |
| `siteincharge` | `site123` | 👷 SITE INCHARGE |
| `munshi` | `munshi123` | 🧾 MUNSHI |
| `subcontractor` | `sub123` | 🔧 SUBCONTRACTOR |

### B. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Backend | Spring Boot 3.2.5 (Java 21) |
| Database | PostgreSQL 16 |
| Auth | JWT (24hr expiry) |
| Mobile | Capacitor 8 (Android) |
| Charts | Recharts 3 |
| HTTP | Axios 1 |
| Speech | Web Speech API / Android SpeechRecognizer |
| Offline | PWA + IndexedDB |
| Backup | Cron + Cloud Storage (AWS S3/GCS) |

---

*End of Document — Site Ledger Final Frozen Structure v3.0*
