# 🏗️ Site Ledger V1.0
## Role, Access Control & Permission BRD

---

**Document Version:** 1.0  
**Prepared For:** Client Review  
**Project Type:** Construction Site ERP System  
**Platform:** Web + Mobile (Android)

---

## 1. PURPOSE

### 1.1 System Objective

Site Ledger ERP का उद्देश्य Construction Business के सभी Financial, Material, Labour, Site Activity एवं Documentation को एक ही Platform पर नियंत्रित करना है।

**इस BRD का उद्देश्य यह निर्धारित करना है:**
- किस User को क्या दिखाई देगा
- किस User को क्या नहीं दिखाई देगा
- कौन क्या Entry कर सकता है
- कौन क्या Edit या Delete कर सकता है

### 1.2 Core Philosophy

> **"जिस व्यक्ति को जितना कार्य करना है, उसे केवल उतना ही दिखाई देगा और उतना ही अधिकार मिलेगा।"**

---

## 2. USER HIERARCHY

```
                    👑 OWNER (MALIK)
                           │
                    ┌──────┴──────┐
                    │             │
              🏢 OFFICE/ADMIN    │
                    │             │
              ┌─────┴─────┐      │
              │           │      │
        SITE INCHARGE   MUNSHI   │
              │           │      │
              └─────┬─────┘      │
                    │            │
              🔧 SUBCONTRACTOR   │
                    │            │
                    └────────────┘
```

### 2.1 Role Summary

| Role | Level | Description |
|---|---|---|
| 👑 **OWNER (Malik)** | Level 1 | सिस्टम का सर्वोच्च स्तर। पूरे ERP का पूर्ण नियंत्रण। |
| 🏢 **OFFICE / ADMIN** | Level 2 | Owner के बाद सबसे महत्वपूर्ण स्तर। Office ERP की निगरानी करेगा। |
| 👷 **SITE STAFF** | Level 3 | Site Incharge + Munshi (V1 में दोनों की Base Role समान रहेगी) |
| 🔧 **SUBCONTRACTOR** | Level 4 | Third Party Work Executor |

---

## 3. ROLE 1: 👑 OWNER (MALIK)

### 3.1 Description

सिस्टम का सर्वोच्च स्तर। Owner पूरे ERP का पूर्ण नियंत्रण रखेगा।

### 3.2 Access

| Access Type | Details |
|---|---|
| **Sites** | ✅ सभी Sites |
| **Users** | ✅ सभी Users |
| **Financial Data** | ✅ सभी Financial Data |
| **Material Data** | ✅ सभी Material Data |
| **Reports** | ✅ सभी Reports |
| **Documents** | ✅ सभी Documents |
| **Ledgers** | ✅ सभी Ledgers |
| **Settings** | ✅ सभी Settings |

### 3.3 Permissions

| Permission | Status |
|---|---|
| User Create | ✅ |
| User Edit | ✅ |
| User Delete | ✅ |
| User Suspend | ✅ |
| Site Create | ✅ |
| Site Edit | ✅ |
| Site Close (Complete/Cancel) | ✅ |
| Site Reopen | ✅ |
| Any Entry Edit | ✅ |
| Any Entry Delete | ✅ |
| Permission Assignment | ✅ |
| Report Export | ✅ |
| System Configuration | ✅ |

### 3.4 Owner Dashboard

Owner को निम्नलिखित Dashboard दिखाई देगा:

```
┌─────────────────────────────────────────────────────┐
│                 OWNER DASHBOARD                      │
├───────────┬───────────┬───────────┬──────────────────┤
│ Total     │ Running   │ Completed│ Contract         │
│ Sites     │ Sites     │ Sites    │ Value            │
│    12     │     8     │     4    │ ₹5,00,00,000     │
├───────────┼───────────┼───────────┼──────────────────┤
│ Total     │ Total     │ Pending  │ Outstanding      │
│ Received  │ Expense   │ Payments │ Advances         │
│ ₹3,50,000 │ ₹2,80,000│ ₹1,50,000│ ₹25,000          │
├───────────┴───────────┴───────────┴──────────────────┤
│ 📈 Overall Profit / Loss : ₹70,000 (Profit)         │
├─────────────────────────────────────────────────────┤
│ Expense Breakdown:                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ██ Material Cost     ₹1,50,000                  │ │
│ │ ██ Labour Cost       ₹80,000                    │ │
│ │ ██ Machinery Cost    ₹30,000                    │ │
│ │ ██ Other Expenses    ₹20,000                    │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Site Wise Profit/Loss:                               │
│ ├── Site A: +₹25,000  │  ├── Site D: -₹5,000       │
│ ├── Site B: +₹40,000  │  ├── Site E: +₹10,000      │
│ └── Site C: +₹15,000  │  └── Site F: -₹15,000      │
└─────────────────────────────────────────────────────┘
```

---

## 4. ROLE 2: 🏢 OFFICE / ADMIN

### 4.1 Description

Owner के बाद सबसे महत्वपूर्ण स्तर। Office ERP की निगरानी करेगा तथा Field Entries को नियंत्रित करेगा।

### 4.2 Access Types

Office/Admin के लिए 4 प्रकार के Access हो सकते हैं:

| Access Type | Description |
|---|---|
| **🟢 Full Access** | सभी Sites पर पूर्ण अधिकार |
| **🔵 Selected Site Access** | केवल चयनित Sites पर अधिकार |
| **🟡 View Only Access** | केवल देखने का अधिकार (Entry नहीं कर सकता) |
| **🟣 Permission Based Access** | Owner द्वारा निर्धारित Module Access |

### 4.3 Configurable Permissions (Owner द्वारा ON/OFF)

| Module | Permission | Default |
|---|---|---|
| **Material Module** | View / Add / Edit / Delete | ON |
| **Labour Module** | View / Add / Edit / Delete | ON |
| **Expense Module** | View / Add / Edit / Delete | ON |
| **Machinery Module** | View / Add / Edit / Delete | ON |
| **Documents Module** | View / Upload / Delete | ON |
| **Reports Module** | View / Export | ON |
| **User Management** | View / Create (limited) | OFF |
| **Edit Rights** | Edit any entry | ON |
| **Delete Rights** | Delete any entry | ON |

### 4.4 Office Responsibilities

| Responsibility | Description |
|---|---|
| Site Monitoring | सभी Sites की नियमित निगरानी |
| Entry Verification | Field Entries की जांच और सत्यापन |
| Error Correction | गलत Entries को सही करना |
| User Management | Users को Manage करना |
| Report Generation | Reports तैयार करना |
| Payment Monitoring | Payments की निगरानी |

---

## 5. ROLE 3: 👷 SITE STAFF

### 5.1 Description

इस Role में निम्नलिखित शामिल होंगे:
- **Site Incharge** — साइट का मुख्य प्रभारी
- **Munshi** — साइट पर डाटा एंट्री करने वाला व्यक्ति

> **V1 में दोनों की Base Role समान रहेगी।** इनकी Permission Office/Admin द्वारा नियंत्रित होगी।

### 5.2 Site Visibility

| Rule | Description |
|---|---|
| **Assigned Sites Only** | Site Staff केवल उन्हीं Sites को देख सकेगा जो उसे Assign की गई हैं |
| **Other Sites Hidden** | उसे अन्य किसी Site की जानकारी नहीं दिखाई जाएगी |

### 5.3 Financial Restrictions

Site Staff को निम्नलिखित जानकारी **नहीं** दिखाई जाएगी:

| Hidden Data | Reason |
|---|---|
| ❌ Contract Value | Financial confidentiality |
| ❌ Total Site Expense | Financial confidentiality |
| ❌ Company Accounts | Financial confidentiality |
| ❌ Profit/Loss | Financial confidentiality |
| ❌ Payment Received | Financial confidentiality |
| ❌ Company Financial Summary | Financial confidentiality |

### 5.4 Permission Matrix (Admin ON/OFF करेगा)

| Module | Permissions | Default |
|---|---|---|
| **📦 Material Module** | □ View Material □ Add Material Entry □ Material Shifting □ Material Stock View | ON |
| **💰 Expense Module** | □ View Expense □ Add Expense Entry | OFF |
| **🚜 Machinery Module** | □ View Machinery □ Add Machinery Entry | OFF |
| **👷 Labour Module** | □ View Labour □ Add Labour Entry | ON |
| **📄 Document Module** | □ View Documents □ Upload Documents | ON |
| **📊 Balance Module** | □ View Personal Balance □ Personal Expense Entry | ON |

### 5.5 Site Staff Entry Types

यदि Permission दी गई हो तो Site Staff निम्नलिखित Entries कर सकेगा:

#### 📦 Material Arrival Entry
| Field | Type | Example |
|---|---|---|
| Material Name | Text | "OPC 43 Grade Cement" |
| Quantity | Number | 100 |
| Unit | Select | Bags |
| Vendor | Text | "UltraTech" |
| Vehicle | Text | "UP14 AB 1234" |
| Date | Date | 01-06-2026 |
| Photo | Image | 📷 |

#### 📦 Material Shifting Entry
| Field | Type | Example |
|---|---|---|
| Material Name | Text | "Steel TMT 500" |
| From Location | Select | "Main Store" |
| To Location | Select | "Floor 3" |
| Quantity | Number | 50 |
| Vehicle | Text | "Truck No. 5678" |
| Date | Date | 01-06-2026 |

#### 🚜 Machinery Entry
| Field | Type | Example |
|---|---|---|
| Machine Name | Text | "JCB 3DX" |
| Hours | Number | 8 |
| Rate | Currency | ₹1,200/hour |
| Vendor | Text | "Verma JCB Service" |
| Date | Date | 01-06-2026 |
| **Calculation** | Auto | 8 × ₹1,200 = ₹9,600 |

#### 🚛 Vehicle / Transport Entry
| Field | Type | Example |
|---|---|---|
| Vehicle Type | Text | "Truck / Tractor / Dumper" |
| Trips | Number | 5 |
| Quantity | Number | 25 (Cum) |
| Rate | Currency | ₹2,500/trip |
| **Calculation** | Auto | 5 × ₹2,500 = ₹12,500 |

#### 👷 Labour Entry
| Field | Type | Example |
|---|---|---|
| Labour Count | Number | 10 |
| Mistri Count | Number | 3 |
| Total Labourers | Auto | 13 |
| Date | Date | 01-06-2026 |
| Amount | Currency | ₹10,400 |

#### 💰 Petty Expense Entry
| Field | Type | Example |
|---|---|---|
| Expense Type | Select | Water / Tea / Tools / Diesel / Misc |
| Amount | Currency | ₹500 |
| Remark | Text | "Drinking water for workers" |
| Photo | Image | 📷 |
| Payment Source | Select | Company Advance / Personal Money / Vendor Credit |

---

## 6. 🔒 ENTRY LOCK SYSTEM

### 6.1 Rule

> **Site Staff द्वारा Save की गई Entry तुरंत Lock हो जाएगी।**

### 6.2 After Locking

| Action | Status |
|---|---|
| ✏️ Edit | ❌ नहीं कर सकता |
| 🗑️ Delete | ❌ नहीं कर सकता |
| 🔄 Modify | ❌ नहीं कर सकता |

### 6.3 Correction Process

```
Site Staff ने गलती की → Site Staff Office को बताएगा
       ↓
Office Verification करेगा → सही है?
       ↓
Office Correction करेगा → Entry सही की जाएगी
       ↓
📋 Audit Log बनेगा → Old Value, New Value, User, Date, Time
```

---

## 7. 📊 MUNSHI / SITE STAFF BALANCE LEDGER

### 7.1 Purpose

Company Advance, Personal Money तथा Vendor Credit का पूरा हिसाब रखना।

### 7.2 Balance Dashboard

Site Staff को अपना Personal Balance Dashboard दिखाई देगा:

```
┌─────────────────────────────────────────────┐
│        MUNSHI BALANCE DASHBOARD              │
├───────────────────┬─────────────────────────┤
│ Company Amount    │ Total Expenses          │
│ Received          │ Submitted               │
│   ₹20,000         │   ₹15,000               │
├───────────────────┼─────────────────────────┤
│ Current Balance   │                         │
│   ₹5,000          │                         │
└───────────────────┴─────────────────────────┘
```

### 7.3 Example Scenarios

#### Example 1: Company Advance diya
```
Company ने ₹20,000 दिए
    ↓
Received = ₹20,000
Expenses = ₹10,000 (किया खर्च)
Balance = ₹10,000 (बचा हुआ - Company को वापस करना है)
```

#### Example 2: Personal Money kharch kiya
```
Munshi ने अपनी जेब से ₹8,000 खर्च किए
    ↓
Received = ₹20,000
Expenses = ₹28,000 (₹20,000 Company + ₹8,000 Personal)
Balance = -₹8,000
    ↓
❗ Meaning: Company को Munshi को ₹8,000 देना बाकी है
```

### 7.4 Payment Source

Expense Entry में से एक चुनना होगा:

| Source | Description | System Effect |
|---|---|---|
| 🏢 **Company Advance** | Company के पैसे से खर्च किया | Company Liability कम होगी |
| 👤 **Personal Money** | Munshi ने अपने पैसे से खर्च किया | Company Liability बढ़ेगी (Munshi को पैसे देने होंगे) |
| 📝 **Vendor Credit / Udhar** | Vendor से उधार लिया | Vendor Outstanding बढ़ेगा |

### 7.5 Settlement

जब Office/Admin भुगतान करेगा:
- Balance स्वतः Adjust होगा
- Audit Log में दर्ज होगा

---

## 8. ROLE 4: 🔧 SUBCONTRACTOR

### 8.1 Description

Third Party Work Executor — ठेकेदार जो साइट पर特定 कार्य करता है।

### 8.2 Access

| Access Type | Details |
|---|---|
| **Sites** | ✅ केवल Assigned Sites |
| **View Data** | ✅ अपना Work, Quantity, Rate, Payment Status |
| **Hidden Data** | ❌ Company Profit, Contract Value, Other Expenses, Company Accounts, Other Contractor Data |

### 8.3 What Subcontractor Can See

```
┌───────────────────────────────────────────────┐
│         SUBCONTRACTOR DASHBOARD                │
├───────────────────────────────────────────────┤
│  📋 Work Done     : 500 Sqft Plastering       │
│  💰 Amount Earned : ₹25,000                    │
│  💳 Amount Paid   : ₹15,000                    │
│  ⏳ Pending Amount: ₹10,000                    │
└───────────────────────────────────────────────┘
```

### 8.4 Work Entry

| Field | Type | Example |
|---|---|---|
| Date | Date | 01-06-2026 |
| Work Type | Text | "Plastering / PCC / Painting" |
| Quantity | Number | 150 |
| Unit | Select | Sqft / Meter / Cum / Nos |
| Rate | Currency | ₹50/sqft |
| **Payable Amount** | Auto | 150 × ₹50 = ₹7,500 |

### 8.5 Material Supplied Entry

| Field | Type | Example |
|---|---|---|
| Material Name | Text | "Cement" |
| Quantity | Number | 50 |
| Unit | Select | Bags |
| Rate | Currency | ₹350/bag |
| Bill Photo | Image | 📷 |
| **Total Amount** | Auto | 50 × ₹350 = ₹17,500 |

---

## 9. 📋 AUDIT TRAIL

### 9.1 Purpose

हर बदलाव रिकॉर्ड होगा:

| Audit Field | Description |
|---|---|
| Old Value | पुरानी Value |
| New Value | नई Value |
| User | किसने बदला |
| Date | कब बदला |
| Time | कितने बजे बदला |

### 9.2 Data Integrity

> **कोई भी Record Permanently Delete नहीं होगा।**  
> सभी बदलाव Audit Log में रिकॉर्ड होंगे।

---

## 10. 🔐 SECURITY PRINCIPLES

| # | Principle |
|---|---|
| 1 | User केवल Assigned Site देखेगा |
| 2 | Field Users Financial Data नहीं देखेंगे |
| 3 | Entry Save होते ही Lock होगी |
| 4 | केवल Office/Admin Edit कर सकेगा |
| 5 | सभी बदलाव Audit Log में रिकॉर्ड होंगे |
| 6 | Owner को Real-Time Visibility मिलेगी |
| 7 | Permission Module आधारित होगी |
| 8 | Role से अधिक महत्वपूर्ण Permission Control होगा |

---

## 11. 📊 FINAL ROLE SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLE SUMMARY TABLE                        │
├──────────────┬──────────────────────────────────────────────┤
│ 👑 OWNER     │ = Everything — Full System Control            │
├──────────────┼──────────────────────────────────────────────┤
│ 🏢 OFFICE/   │ = Configurable Access — Owner sets limits     │
│    ADMIN     │   • Full / Selected Site / View Only / Perm   │
├──────────────┼──────────────────────────────────────────────┤
│ 👷 SITE      │ = Permission Based Entry Access               │
│    STAFF     │   • Assigned Sites Only                       │
│              │   • Financial Data Hidden                     │
│              │   • Entries Auto-Locked                       │
│              │   • Personal Balance Tracking                 │
├──────────────┼──────────────────────────────────────────────┤
│ 🔧 SUBCON-  │ = Own Work Only                                │
│    TRACTOR   │   • अपना Work, Quantity, Rate, Payment        │
│              │   • Company Financials Hidden                 │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 12. 🗺️ MODULE-WISE ACCESS MATRIX

| Module | OWNER | OFFICE/ADMIN | SITE STAFF | SUBCONTRACTOR |
|---|---|---|---|---|
| **Owner Dashboard** | ✅ Full | ✅ Full | ❌ | ❌ |
| **Site Dashboard (Financial)** | ✅ Full | ✅ Full | ❌ (Hidden) | ❌ |
| **Site Dashboard (Operational)** | ✅ Full | ✅ Full | ✅ Limited | ✅ Limited |
| **Sites — All** | ✅ | ✅ Configurable | ✅ Assigned Only | ✅ Assigned Only |
| **Sites — Create/Edit/Delete** | ✅ | ✅ Configurable | ❌ | ❌ |
| **Ledger (Accounting)** | ✅ Full | ✅ Configurable | ❌ | ❌ |
| **Materials — View** | ✅ | ✅ | ✅ (If Permitted) | ❌ |
| **Materials — Add Entry** | ✅ | ✅ | ✅ (If Permitted) | ❌ |
| **Materials — Shifting** | ✅ | ✅ | ✅ (If Permitted) | ❌ |
| **Labour — View** | ✅ | ✅ | ✅ (If Permitted) | ❌ |
| **Labour — Add Entry** | ✅ | ✅ | ✅ (If Permitted) | ❌ |
| **Machinery** | ✅ | ✅ | ✅ (If Permitted) | ❌ |
| **Vehicle/Transport** | ✅ | ✅ | ✅ (If Permitted) | ❌ |
| **Petty Expense** | ✅ | ✅ | ✅ (If Permitted) | ❌ |
| **Balance Ledger** | ✅ | ✅ | ✅ Own Only | ❌ |
| **Advances** | ✅ Full | ✅ Configurable | ❌ | ❌ |
| **Payments** | ✅ Full | ✅ Configurable | ❌ | ❌ |
| **Documents — View** | ✅ | ✅ | ✅ | ✅ |
| **Documents — Upload** | ✅ | ✅ | ✅ | ✅ |
| **Subcontractor Work** | ✅ All | ✅ All | ❌ | ✅ Own Only |
| **Users — View** | ✅ All | ✅ | ❌ | ❌ |
| **Users — Create/Edit** | ✅ All | ❌ | ❌ | ❌ |
| **Reports** | ✅ Full | ✅ Configurable | ❌ | ❌ |
| **Audit Logs** | ✅ Full | ✅ | ❌ | ❌ |
| **System Settings** | ✅ Full | ❌ | ❌ | ❌ |

---

## 13. 🖥️ SYSTEM MODULES (V1.0)

### 13.1 Core Modules

| # | Module | Description |
|---|---|---|
| M1 | **Authentication** | JWT-based login, role verification |
| M2 | **Site Management** | Create, edit, manage site lifecycle |
| M3 | **Dashboard** | Owner + Site dashboards with KPIs |
| M4 | **Material Management** | Purchase, shift, consume, inventory tracking |
| M5 | **Labour Management** | Daily labour entry with auto-lock |
| M6 | **Machinery Management** | Machine hours, rate, vendor tracking |
| M7 | **Vehicle/Transport** | Vehicle trips, quantity, rate tracking |
| M8 | **Petty Expense** | Small expense tracking with payment source |
| M9 | **Balance Ledger** | Munshi/Site Staff personal balance tracking |
| M10 | **Ledger / Accounting** | Credit/Debit entries, profit/loss calculation |
| M11 | **Advance Management** | Advance to personnel, expense tracking, settlement |
| M12 | **Payment / Billing** | Bill tracking, payment received, pending |
| M13 | **Document Management** | 17 document types, version control, photo upload |
| M14 | **Subcontractor Work** | Work logging, material, payment status |
| M15 | **User Management** | User CRUD, roles, permissions, suspend |
| M16 | **Audit Trail** | Complete activity logging |
| M17 | **Permission System** | Module-level permission ON/OFF per role |

### 13.2 User Count Per Module

| Screens / Modules | Owner | Office Admin | Site Incharge | Munshi | Subcontractor | Subcontractor Admin |
|---|---|---|---|---|---|---|
| Login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Owner Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Site List | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Site Detail Dashboard | ✅ | ✅ | ✅ (Limited) | ✅ (Limited) | ✅ (Limited) | ✅ (Limited) |
| Site Ledger | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Materials | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Labour | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Machinery | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ | ❌ |
| Vehicle/Transport | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ | ❌ |
| Petty Expenses | ✅ | ✅ | ✅ (If Perm) | ✅ (If Perm) | ❌ | ❌ |
| Balance Ledger | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Advances | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Payments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Subcontractor Work | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Users | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (Limited) |
| Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 14. 🔧 TECHNICAL SPECIFICATIONS

### 14.1 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Backend | Spring Boot 3.2.5 (Java 21) |
| Database | PostgreSQL 16 |
| Auth | JWT (24hr expiry) |
| Mobile | Capacitor 8 (Android) |
| Charts | Recharts 3 |
| HTTP | Axios 1 |

### 14.2 Default Login Credentials

| Username | Password | Role |
|---|---|---|
| `owner` | `owner123` | 👑 Owner |
| `admin` | `admin123` | 🏢 Office Admin |
| `siteincharge` | `site123` | 👷 Site Incharge |
| `munshi` | `munshi123` | 📋 Munshi |
| `subcontractor` | `sub123` | 🔧 Subcontractor |
| `subadmin` | `subadmin123` | 👥 Subcontractor Admin |

### 14.3 Deployment

```bash
# Backend
cd backend && mvn clean package -DskipTests
java -jar target/site-ledger-backend-1.0.0.jar    # Port 8081

# Frontend
cd frontend && npm install && npm run dev         # Port 5173

# Database
# PostgreSQL on localhost:5444, DB: site_ledger
```

---

## 15. 🚀 FUTURE ENHANCEMENTS (V2.0+)

| # | Feature | Priority |
|---|---|---|
| 1 | **Barcode/QR Scan** for material tracking | Medium |
| 2 | **GPS Check-in** for site visits | Medium |
| 3 | **Offline Support** (PWA) for field data entry | High |
| 4 | **Multi-language** (Hindi UI) | Medium |
| 5 | **Push Notifications** for pending tasks | Medium |
| 6 | **Excel/PDF Report Export** | High |
| 7 | **Email Reports** auto-scheduled | High |
| 8 | **GST Invoicing** integration | Low |

---

## 16. ✅ BUG FIXES APPLIED

| # | Issue | Fix |
|---|---|---|
| 1 | `locked` column missing in `labour_entries` | Added column to database |
| 2 | `user_id` NULL in Material Transactions | Added setUser() in controller |
| 3 | `user_id` NULL in Labour Entries | Added setUser() in controller |
| 4 | `user_id` NULL in Advances | Added setUser() in controller |
| 5 | `user_id` NULL in Payments | Added setUser() in controller |
| 6 | `user_id` NULL in Documents | Added setUser() in controller |

---

*End of Document — Site Ledger V1.0 BRD*
