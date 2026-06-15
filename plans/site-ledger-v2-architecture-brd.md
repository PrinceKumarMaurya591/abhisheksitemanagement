# 🏗️ Site Ledger V2.0 — Architecture & BRD

## Overview

This document defines the **enhanced architecture** for Site Ledger V2.0, introducing **Nikay/Yojna** hierarchy, **Mate role**, **time-based access control**, and **configurable Other Expenses module**.

**Document Version:** 2.0 (Draft for Review)  
**Based On:** Existing Site Ledger V1.0 codebase  
**Platform:** Web + Mobile (Android) — React 19 + Spring Boot 3.2.5 + PostgreSQL 16

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Model](#2-data-model)
3. [Role & Permission Matrix](#3-role--permission-matrix)
4. [Time-Based Access Control](#4-time-based-access-control)
5. [Other Expenses Module](#5-other-expenses-module)
6. [API Design](#6-api-design)
7. [Frontend Routes & Components](#7-frontend-routes--components)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. System Architecture

### 1.1 Hierarchical Structure

```
┌──────────────────────────────────────────────────────────┐
│                    SYSTEM HIERARCHY                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   👑 OWNER ────── Full System Control                    │
│     │                                                    │
│   🏢 OFFICE_ADMIN ── Configurable Access                 │
│     │                                                    │
│   ┌─────────────────────────────────────┐                │
│   │         NIKAY / YOJNA               │  ← NEW ENTITY │
│   │  (e.g., Pandit Deen Dayal Yojna,    │                │
│   │   Jal Nikash Yojna, Pay Jal)        │                │
│   └────────────┬────────────────────────┘                │
│                │ has-many                                │
│   ┌────────────┴────────────────────────┐                │
│   │           SITE / SECTION            │                │
│   │  (e.g., KLD, GKP, Lucknow, Varanasi)│                │
│   └────────────┬────────────────────────┘                │
│                │ assigned-staff                          │
│   ┌────────────┼────────────┬───────────────┐            │
│   │            │            │               │            │
│   ▼            ▼            ▼               ▼            │
│ SITE_INCHARGE MUNSHI      MATE          SUBCONTRACTOR    │
│  5-day full   24-hr view  24-hr view    Own work only    │
│  access (no   only         only                          │
│  delete)                                                 │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Module Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 + Vite 8)                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Auth     │ │ Yojna    │ │ Site     │ │ Staff Assignment  │  │
│  │ Pages    │ │ CRUD     │ │ CRUD     │ │ UI                │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Existing │ │ Time     │ │ Other    │ │ Expense Category  │  │
│  │ Modules  │ │ Access   │ │ Expenses │ │ Config UI         │  │
│  │ (M-L-T-D)│ │ Display  │ │ Module   │ │ (Admin)           │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Axios API
┌──────────────────────────┴───────────────────────────────────────┐
│                    BACKEND (Spring Boot 3.2.5)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ JWT Auth │ │ Yojna    │ │ Site     │ │ Time Access       │  │
│  │ Filter   │ │ Controller│ │Controller │ │ Validator Service │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Expense  │ │ Other    │ │ Permission│ │ Audit Trail      │  │
│  │ Category │ │ Expense  │ │ Service   │ │ Service           │  │
│  │ Service  │ │ Service  │ │           │ │                   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ JPA/Hibernate
┌──────────────────────────┴───────────────────────────────────────┐
│                    DATABASE (PostgreSQL 16)                       │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ yojnas   │ │ sites    │ │ users    │ │ expense_categories│  │
│  │ table    │ │ table    │ │ table    │ │ table             │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────────────────┐   │
│  │ other    │ │site_staff│ │ permissions                   │   │
│  │ expenses │ │assign    │ │ table                         │   │
│  │ table    │ │table     │ │                               │   │
│  └──────────┘ └──────────┘ └───────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 User Hierarchy (Updated)

```
                        👑 OWNER
                           │
                    ┌──────┴──────┐
                    │             │
              🏢 OFFICE_ADMIN    │
              (Full/Selected/    │
               View Only/Perm)   │
                    │             │
         ┌──────────┼──────────┐  │
         │          │          │  │
   SITE_INCHARGE  MUNSHI    MATE │
   (5-day full,  (24-hr     (24-hr│
    no delete)    view only) view │
         │          │          │  │
         └──────────┼──────────┘  │
                    │             │
              🔧 SUBCONTRACTOR    │
                    │             │
              🔧 SUBCONTRACTOR_ADMIN
```

---

## 2. Data Model

### 2.1 New Entities

#### YojnaEntity (NEW)

```java
@Entity
@Table(name = "yojnas")
public class YojnaEntity {
    Long id;
    String yojnaName;          // e.g., "Pandit Deen Dayal Yojna"
    String description;        // optional description
    String department;         // optional department
    LocalDate startDate;
    LocalDate endDate;
    YojnaStatus status;        // ACTIVE, INACTIVE
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    
    // Relationships
    @OneToMany(mappedBy = "yojna")
    List<SiteEntity> sites;
    
    enum YojnaStatus { ACTIVE, INACTIVE }
}
```

#### SiteEntity (MODIFIED — add yojna_id foreign key)

```java
@Entity
@Table(name = "sites")
public class SiteEntity {
    // ... existing fields remain ...
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "yojna_id")
    YojnaEntity yojna;         // NEW: parent Yojna
    
    @ManyToMany  // existing
    Set<UserEntity> assignedStaff;
    
    // ... existing fields ...
}
```

#### ExpenseCategoryEntity (NEW — Configurable)

```java
@Entity
@Table(name = "expense_categories")
public class ExpenseCategoryEntity {
    Long id;
    String categoryName;       // e.g., "Water Supply", "Electricity", "Tea"
    String description;
    Boolean isActive;          // enable/disable
    Long createdBy;            // admin user id
    LocalDateTime createdAt;
    
    // Applicable at which level?
    @ElementCollection
    @Enumerated(EnumType.STRING)
    List<ExpenseLevel> applicableLevels;  // YOJNA, SITE, STAFF
    
    enum ExpenseLevel { YOJNA, SITE, STAFF }
}
```

#### OtherExpenseEntity (NEW — Separate Module)

```java
@Entity
@Table(name = "other_expenses")
public class OtherExpenseEntity {
    Long id;
    
    // Category reference
    @ManyToOne
    ExpenseCategoryEntity category;
    
    BigDecimal amount;
    LocalDate date;
    String description;
    String receiptPhoto;
    
    // Level of applicability
    ExpenseLevel expenseLevel;     // YOJNA, SITE, STAFF
    
    // Nullable depending on level
    Long yojnaId;                  // if YOJNA level
    Long siteId;                   // if SITE level
    Long staffUserId;              // if STAFF level (Munshi/Mate)
    
    @ManyToOne
    UserEntity createdBy;          // who added this expense
    UserEntity user;               // the user who made the expense
    
    String paymentSource;          // COMPANY_ADVANCE, PERSONAL_MONEY, VENDOR_CREDIT
    
    LocalDateTime createdAt;
}
```

### 2.2 Staff Assignment Enhancement

The existing `site_assigned_staff` join table remains, but we add a **role-specific assignment** tracking:

```sql
-- Enhancement: Add assigned_at timestamp to track when staff was assigned
-- This drives the time-based access logic
ALTER TABLE site_assigned_staff 
  ADD COLUMN assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Or better: Create a new assignment entity
CREATE TABLE site_staff_assignments (
    id BIGSERIAL PRIMARY KEY,
    site_id BIGINT NOT NULL REFERENCES sites(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL,  -- SITE_INCHARGE, MUNSHI, MATE
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_by BIGINT REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);
```

### 2.3 ER Diagram

```
┌──────────────────┐       ┌────────────────────┐
│     yojnas       │       │      sites          │
├──────────────────┤       ├────────────────────┤
│ id (PK)          │◄──────┤ yojna_id (FK)      │
│ yojna_name       │ 1:N   │ id (PK)            │
│ description      │       │ site_name          │
│ department       │       │ department         │
│ start_date       │       │ work_name          │
│ end_date         │       │ contract_value     │
│ status           │       │ ... (existing)     │
│ created_at       │       │ created_at         │
└──────────────────┘       └────────┬───────────┘
                                    │ M:N
                     ┌──────────────┴───────────────┐
                     │ site_assigned_staff           │
                     ├──────────────────────────────┤
                     │ site_id (FK)                 │
                     │ user_id (FK)                 │
                     │ assigned_at                  │
                     │ assigned_by                  │
                     │ is_active                    │
                     └──────────────┬───────────────┘
                                    │
                     ┌──────────────┴───────────────┐
                     │        users                  │
                     ├──────────────────────────────┤
                     │ id (PK)                      │
                     │ username                     │
                     │ password                     │
                     │ role (ENUM)                  │
                     │ ... (existing)               │
                     └──────────────────────────────┘
                                    ▲
┌────────────────────┐              │
│ expense_categories │              │
├────────────────────┤              │
│ id (PK)            │              │
│ category_name      │              │
│ description        │              │
│ is_active          │              │
│ created_by         │──────────────┘
│ created_at         │
└────────────────────┘

┌───────────────────────────────────┐
│       other_expenses              │
├───────────────────────────────────┤
│ id (PK)                           │
│ category_id (FK → expense_categories)
│ amount                            │
│ date                              │
│ description                       │
│ expense_level (YOJNA/SITE/STAFF)  │
│ yojna_id (nullable)               │
│ site_id (nullable)                │
│ staff_user_id (nullable)          │
│ created_by_id (FK → users)        │
│ user_id (FK → users)              │
│ payment_source                    │
│ created_at                        │
└───────────────────────────────────┘
```

---

## 3. Role & Permission Matrix

### 3.1 Updated Role Enum

```java
public enum Role {
    OWNER,                  // Full system control
    OFFICE_ADMIN,           // Configurable access
    SITE_INCHARGE,          // Site chief - 5 day full access (no delete)
    MUNSHI,                 // Data entry - 24 hr view only
    MATE,                   // NEW: Field assistant - 24 hr view only
    SUBCONTRACTOR,          // Third party worker
    SUBCONTRACTOR_ADMIN     // Manages subcontractors
}
```

### 3.2 Permission Matrix (V2.0 Enhanced)

| Module / Feature | OWNER | OFFICE_ADMIN | SITE_INCHARGE | MUNSHI | MATE | SUBCONTRACTOR | SUBCONTRACTOR_ADMIN |
|---|---|---|---|---|---|---|---|
| **Yojna CRUD** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Site CRUD** | ✅ Full | ✅ Config | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Staff Assignment** | ✅ Full | ✅ Config | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Expense Category Config** | ✅ Full | ✅ Add | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Other Expenses - View** | ✅ All | ✅ All | ✅ Site (5d) | ✅ Site (24h) | ✅ Site (24h) | ❌ | ❌ |
| **Other Expenses - Add** | ✅ All | ✅ All | ✅ Site (5d) | ❌ | ❌ | ❌ | ❌ |
| **Other Expenses - Edit** | ✅ All | ✅ All | ✅ Site (5d) | ❌ | ❌ | ❌ | ❌ |
| **Other Expenses - Delete** | ✅ All | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Existing Modules** | ✅ Full | ✅ Config | ✅ (permitted) | ✅ (permitted) | ✅ (permitted) | ✅ Own Only | ✅ Own Only |

### 3.3 Time-Based Access Rules

| Role | View Window | Edit Window | Delete |
|---|---|---|---|
| **SITE_INCHARGE** | 5 days from entry creation | 5 days from entry creation | ❌ Never |
| **MUNSHI** | 24 hours from entry creation | ❌ Never | ❌ Never |
| **MATE** | 24 hours from entry creation | ❌ Never | ❌ Never |
| **OWNER/OFFICE_ADMIN** | Unlimited | Unlimited | ✅ |

> **Access Validation Logic (Backend Service):**
> ```
> For SITE_INCHARGE:
>   elapsed = now - entry.createdAt
>   if elapsed <= 5 days:
>       canView = true, canEdit = true, canDelete = false
>   else:
>       canView = false, canEdit = false, canDelete = false
>
> For MUNSHI/MATE:
>   elapsed = now - entry.createdAt
>   if elapsed <= 24 hours:
>       canView = true, canEdit = false, canDelete = false
>   else:
>       canView = false, canEdit = false, canDelete = false
> ```

---

## 4. Time-Based Access Control

### 4.1 Service Layer

Create a new service: [`TimeAccessService.java`](backend/src/main/java/com/siteledger/service/TimeAccessService.java)

```java
@Service
public class TimeAccessService {
    
    public boolean canViewEntry(UserEntity user, BaseEntry entry) {
        if (isOwnerOrAdmin(user)) return true;
        if (roleHasTimeLimit(user)) {
            return isWithinTimeWindow(entry.getCreatedAt(), getWindowDuration(user));
        }
        return false;
    }
    
    public boolean canEditEntry(UserEntity user, BaseEntry entry) {
        if (isOwnerOrAdmin(user)) return true;
        if (user.getRole() == Role.SITE_INCHARGE) {
            return isWithinTimeWindow(entry.getCreatedAt(), Duration.ofDays(5));
        }
        return false;  // MUNSHI/MATE cannot edit
    }
    
    public boolean canDeleteEntry(UserEntity user) {
        return user.getRole() == Role.OWNER || user.getRole() == Role.OFFICE_ADMIN;
    }
    
    private Duration getWindowDuration(UserEntity user) {
        return switch (user.getRole()) {
            case SITE_INCHARGE -> Duration.ofDays(5);
            case MUNSHI, MATE -> Duration.ofHours(24);
            default -> Duration.ZERO;
        };
    }
    
    private boolean isWithinTimeWindow(LocalDateTime createdAt, Duration window) {
        return ChronoUnit.MINUTES.between(createdAt, LocalDateTime.now()) <= window.toMinutes();
    }
}
```

### 4.2 Applying Access Checks

- Create a base entity or interface `TimeAwareEntry` with `createdAt` field
- Apply `TimeAccessService` checks in all controllers before returning/modifying data
- For MUNSHI/MATE: return filtered data (remove entries older than 24h) in GET endpoints
- For SITE_INCHARGE: return only entries created within last 5 days, but allow edit on those

---

## 5. Other Expenses Module

### 5.1 Configurable Expense Categories (Admin)

**Backend:**
- [`ExpenseCategoryController.java`](backend/src/main/java/com/siteledger/controller/ExpenseCategoryController.java)
- [`ExpenseCategoryRepository.java`](backend/src/main/java/com/siteledger/repository/ExpenseCategoryRepository.java)  
- [`ExpenseCategoryEntity.java`](backend/src/main/java/com/siteledger/entity/ExpenseCategoryEntity.java)

**Frontend:**
- [`ExpenseCategoriesPage.jsx`](frontend/src/pages/ExpenseCategoriesPage.jsx) — Admin-only page to manage categories

### 5.2 Other Expenses Entry Module

**Backend:**
- [`OtherExpenseController.java`](backend/src/main/java/com/siteledger/controller/OtherExpenseController.java)
- [`OtherExpenseRepository.java`](backend/src/main/java/com/siteledger/repository/OtherExpenseRepository.java)
- [`OtherExpenseEntity.java`](backend/src/main/java/com/siteledger/entity/OtherExpenseEntity.java)

**Frontend Components:**
- [`OtherExpensesPage.jsx`](frontend/src/pages/OtherExpensesPage.jsx) — Main listing
- [`OtherExpenseForm.jsx`](frontend/src/components/OtherExpenseForm.jsx) — Entry form
- Embedded in Site Detail page for site-level expenses
- Embedded in Yojna Detail page for yojna-level expenses
- Staff dashboard section for staff-level expenses

### 5.3 API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| **Expense Categories** | | | |
| GET | `/api/expense-categories` | List all categories | OWNER, OFFICE_ADMIN |
| POST | `/api/expense-categories` | Create category | OWNER, OFFICE_ADMIN |
| PUT | `/api/expense-categories/{id}` | Update category | OWNER, OFFICE_ADMIN |
| DELETE | `/api/expense-categories/{id}` | Delete category | OWNER |
| **Other Expenses** | | | |
| GET | `/api/other-expenses?level=YOJNA&yojnaId=1` | List by Yojna | Per role+time |
| GET | `/api/other-expenses?level=SITE&siteId=1` | List by Site | Per role+time |
| GET | `/api/other-expenses?level=STAFF&staffUserId=1` | List by Staff | Per role+time |
| POST | `/api/other-expenses` | Create entry | OWNER, OFFICE_ADMIN, SITE_INCHARGE |
| PUT | `/api/other-expenses/{id}` | Edit entry | OWNER, OFFICE_ADMIN, SITE_INCHARGE (5d) |
| DELETE | `/api/other-expenses/{id}` | Delete entry | OWNER, OFFICE_ADMIN |

---

## 6. API Design

### 6.1 Yojna API

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/yojnas` | List all Yojnas | Authenticated (filtered by role) |
| GET | `/api/yojnas/{id}` | Get Yojna details | Authenticated (site access check) |
| POST | `/api/yojnas` | Create Yojna | OWNER, OFFICE_ADMIN |
| PUT | `/api/yojnas/{id}` | Update Yojna | OWNER, OFFICE_ADMIN |
| DELETE | `/api/yojnas/{id}` | Delete Yojna | OWNER |
| PUT | `/api/yojnas/{id}/status` | Change Yojna status | OWNER, OFFICE_ADMIN |
| GET | `/api/yojnas/{id}/sites` | Get sites under Yojna | Authenticated |

### 6.2 Staff Assignment API (Enhanced)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/sites/{siteId}/assign` | Assign staff to site | OWNER, OFFICE_ADMIN |
| DELETE | `/api/sites/{siteId}/assign/{userId}` | Remove staff from site | OWNER, OFFICE_ADMIN |
| GET | `/api/sites/{siteId}/staff` | List staff of site | OWNER, OFFICE_ADMIN |

### 6.3 Time-Aware Entry Retrieval

All existing entity GET endpoints should accept a query parameter to filter by time window:
```
GET /api/entries?siteId=1&withinWindow=true
```

When `withinWindow=true`, the backend filters entries based on the user's role-specific time window.

---

## 7. Frontend Routes & Components

### 7.1 New Routes

| Route | Component | Description |
|---|---|---|
| `/yojnas` | [`YojnasPage.jsx`](frontend/src/pages/YojnasPage.jsx) | List all Yojnas |
| `/yojnas/:id` | [`YojnaDetailPage.jsx`](frontend/src/pages/YojnaDetailPage.jsx) | Yojna detail with sites |
| `/yojnas/:id/other-expenses` | [`OtherExpensesPage.jsx`](frontend/src/pages/OtherExpensesPage.jsx) | Yojna-level other expenses |
| `/expense-categories` | [`ExpenseCategoriesPage.jsx`](frontend/src/pages/ExpenseCategoriesPage.jsx) | Admin config page |
| `/sites/:id/other-expenses` | [`OtherExpensesPage.jsx`](frontend/src/pages/OtherExpensesPage.jsx) | Site-level other expenses |
| `/staff/:id/other-expenses` | [`OtherExpensesPage.jsx`](frontend/src/pages/OtherExpensesPage.jsx) | Staff-level other expenses |

### 7.2 Modified Routes

| Route | Modification |
|---|---|
| `/sites` | Add Yojna filter dropdown |
| `/sites/:id` | Show Yojna info + Other Expenses tab |

### 7.3 Navigation Structure

```
Dashboard
├── Yojnas (NEW)
│   └── Yojna Detail
│       ├── Sites under Yojna
│       ├── Yojna Level Other Expenses
│       └── Staff assigned to Yojna sites
├── Sites (MODIFIED - filtered by Yojna)
│   └── Site Detail
│       ├── Existing modules (Materials, Labour, etc.)
│       ├── Site Level Other Expenses (NEW)
│       └── Staff Assignment (for Admin)
├── Other Expenses (NEW - consolidated view)
│   ├── By Yojna
│   ├── By Site
│   └── By Staff
├── Expense Categories (NEW - Admin only)
├── Users (existing)
└── Reports (existing)
```

---

## 8. Implementation Plan

### Phase 1: Data Model Changes

| # | Task | Files |
|---|---|---|
| 1.1 | Create [`YojnaEntity.java`](backend/src/main/java/com/siteledger/entity/YojnaEntity.java) | New entity |
| 1.2 | Create [`YojnaRepository.java`](backend/src/main/java/com/siteledger/repository/YojnaRepository.java) | New repository |
| 1.3 | Modify [`SiteEntity.java`](backend/src/main/java/com/siteledger/entity/SiteEntity.java) | Add `@ManyToOne yojna` field |
| 1.4 | Add MATE role to [`UserEntity.java`](backend/src/main/java/com/siteledger/entity/UserEntity.java) | Update Role enum |
| 1.5 | Create [`site_staff_assignments`](backend/src/main/resources/db/migration/) table | New table with assigned_at |
| 1.6 | Create [`ExpenseCategoryEntity.java`](backend/src/main/java/com/siteledger/entity/ExpenseCategoryEntity.java) | New entity |
| 1.7 | Create [`OtherExpenseEntity.java`](backend/src/main/java/com/siteledger/entity/OtherExpenseEntity.java) | New entity |
| 1.8 | Create repositories for new entities | New repositories |
| 1.9 | Update DataSeeder with MATE user + default permissions | DataSeeder.java |

### Phase 2: Backend Services & Controllers

| # | Task | Files |
|---|---|---|
| 2.1 | Create [`TimeAccessService.java`](backend/src/main/java/com/siteledger/service/TimeAccessService.java) | New service |
| 2.2 | Create [`YojnaController.java`](backend/src/main/java/com/siteledger/controller/YojnaController.java) | New controller |
| 2.3 | Modify [`SiteController.java`](backend/src/main/java/com/siteledger/controller/SiteController.java) | Yojna filtering + enhanced assignment |
| 2.4 | Create [`ExpenseCategoryController.java`](backend/src/main/java/com/siteledger/controller/ExpenseCategoryController.java) | New controller |
| 2.5 | Create [`OtherExpenseController.java`](backend/src/main/java/com/siteledger/controller/OtherExpenseController.java) | New controller |
| 2.6 | Apply TimeAccessService to existing controllers | Materials, Labour, Expense, Machinery, Transport |
| 2.7 | Update API response DTOs to include time-window info | DTOs |

### Phase 3: Frontend Pages & Components

| # | Task | Files |
|---|---|---|
| 3.1 | Create [`YojnasPage.jsx`](frontend/src/pages/YojnasPage.jsx) | CRUD list for Yojnas |
| 3.2 | Create [`YojnaDetailPage.jsx`](frontend/src/pages/YojnaDetailPage.jsx) | Yojna detail with sites |
| 3.3 | Create [`yojnaApi.js`](frontend/src/api/yojnaApi.js) | API client |
| 3.4 | Modify [`SitesPage.jsx`](frontend/src/pages/SitesPage.jsx) | Add Yojna filter |
| 3.5 | Modify [`SiteDetailPage.jsx`](frontend/src/pages/SiteDetailPage.jsx) | Add Yojna info + Other Expenses tab |
| 3.6 | Create [`ExpenseCategoriesPage.jsx`](frontend/src/pages/ExpenseCategoriesPage.jsx) | Admin config UI |
| 3.7 | Create [`OtherExpensesPage.jsx`](frontend/src/pages/OtherExpensesPage.jsx) | Other Expenses CRUD |
| 3.8 | Create [`expenseCategoryApi.js`](frontend/src/api/expenseCategoryApi.js) | API client |
| 3.9 | Create [`otherExpenseApi.js`](frontend/src/api/otherExpenseApi.js) | API client |
| 3.10 | Update App.jsx routes | Add new routes |
| 3.11 | Update Layout component | Add navigation links |

### Phase 4: Time-Based Access UI

| # | Task | Files |
|---|---|---|
| 4.1 | Add countdown timer component | [`TimeAccessBadge.jsx`](frontend/src/components/TimeAccessBadge.jsx) |
| 4.2 | Disable edit/delete buttons based on time window | All entry pages |
| 4.3 | Add visual indicators for expiring access | All entry pages |
| 4.4 | Show "access expired" state for entries | All entry pages |

### Phase 5: Testing & Deployment

| # | Task |
|---|---|
| 5.1 | Update database migration scripts |
| 5.2 | Test all role-based flows |
| 5.3 | Test time-based access expiry |
| 5.4 | Test Other Expenses CRUD at all levels |
| 5.5 | Update Docker and deployment configs |

---

## 9. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Yojna as separate entity** (not just a field on Site) | Enables Yojna-level other expenses, independent CRUD, reusability |
| **Separate OtherExpenseEntity** (not reusing ExpenseEntity) | Different access patterns, configurable categories, Yojna/Site/Staff levels |
| **TimeAccessService as centralized service** | Consistent time validation across all controllers, single source of truth |
| **site_staff_assignments table with assigned_at** | Tracks exactly when staff was assigned, enables future enhancements (auto-unassign after expiry) |
| **MATE as separate role** | Different permission pattern from MUNSHI (both 24h view-only but may diverge in future) |
| **ExpenseCategoryEntity with applicableLevels** | Flexible - same category can apply to Yojna, Site, AND Staff simultaneously |

---

*End of Document — Site Ledger V2.0 Architecture & BRD (Draft)*
