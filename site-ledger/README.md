# Site Ledger V1.0 - Construction ERP

A comprehensive Construction Enterprise Resource Planning (ERP) system built with Spring Boot, React, and PostgreSQL. This system manages construction sites, materials, labour, advances, payments, documents, and provides a complete ledger system with owner and site-level dashboards.

## Features

- **User Management**: Role-based access with Super Admin, Manager, Site Incharge, Supervisor, Munshi, Mate, Store Keeper, Accountant
- **Site Management**: Create and manage multiple construction sites with status tracking
- **Owner Dashboard**: Aggregated view of all sites with KPIs, charts, and financial summaries
- **Site Dashboard**: Per-site financial overview with expense breakdown and material summary
- **Site Master Ledger**: Bank-statement-like ledger with credit/debit entries by category
- **Material Management**: Complete material lifecycle - purchase, shifting, consumption, and balance tracking
- **Labour Management**: Track labour costs and categories per site
- **Advance & Settlement**: Manage advances with expense tracking and settlement
- **Payment Tracking**: Bill-to-payment reconciliation with pending amount tracking
- **Document Management**: Upload and manage documents with 17+ document types and version control
- **JWT Authentication**: Secure stateless authentication with role-based authorization
- **REST API**: Full-featured RESTful API with proper error handling

## Tech Stack

### Backend
- **Java 21** with **Spring Boot 3.2.5**
- **Spring Data JPA** - Database access
- **Spring Security** - Authentication & authorization
- **JWT (jjwt 0.12.5)** - Token-based authentication
- **PostgreSQL** - Primary database
- **Apache POI 5.2.5** - Excel export
- **Lombok** - Boilerplate reduction
- **BCrypt** - Password hashing

### Frontend
- **React 18** with **Vite**
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **Recharts** - Charts and graphs
- **Tailwind CSS** - Utility-first styling

### Infrastructure
- **Docker Compose** - PostgreSQL containerization

## Project Structure

```
site-ledger/
├── backend/                    # Spring Boot application
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/siteledger/
│       │   ├── SiteLedgerApplication.java
│       │   ├── config/         # Security config, exception handler, data seeder
│       │   ├── controller/     # REST controllers (10)
│       │   ├── dto/            # Data transfer objects
│       │   ├── entity/         # JPA entities (10)
│       │   ├── repository/     # Spring Data repositories
│       │   ├── security/       # JWT provider & filter
│       │   └── service/        # Business logic services
│       └── resources/
│           └── application.properties
├── frontend/                   # React application
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api/                # API client modules (10)
│       ├── components/         # Reusable components (Layout)
│       ├── context/            # React context (Auth)
│       └── pages/              # Page components (11)
└── infra/
    └── docker-compose.yml      # PostgreSQL setup
```

## Prerequisites

- **Java 21** or later
- **Node.js 18** or later
- **npm 9** or later
- **Docker** and **Docker Compose** (for PostgreSQL)
- **Maven 3.9** or later (or use the Maven wrapper)

## Setup Instructions

### 1. Start PostgreSQL with Docker

```bash
cd infra
docker-compose up -d
```

This starts PostgreSQL 16 on port 5432 with:
- Database: `site_ledger`
- Username: `siteledger`
- Password: `siteledger123`

### 2. Run the Backend

```bash
cd backend
mvn spring-boot:run
```

The backend starts on `http://localhost:8080`.

Default users are auto-seeded:
| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | SUPER_ADMIN |
| `manager` | `manager123` | MANAGER |
| `siteincharge` | `site123` | SITE_INCHARGE |

### 3. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`.

### 4. Access the Application

Open `http://localhost:5173` in your browser and log in with any of the default credentials.

---

## Android APK Build (Mobile App)

This project uses **Capacitor** to wrap the React frontend into a native Android APK. The Android platform is already configured in [`frontend/android/`](frontend/android/).

### Prerequisites (for APK build)

- **Node.js 18+** and **npm 9+**
- **Android Studio** (with Android SDK, build tools, and a configured local.properties)
- **Java 17+** (for Gradle)
- An Android device or emulator for testing

### Step-by-Step APK Build

```bash
# 1. Build the React frontend (produces dist/ folder)
cd frontend
npm install
npm run build

# 2. Sync the web build to Capacitor's Android platform
npx cap sync android

# 3. Build the debug APK using Gradle
cd android
./gradlew assembleDebug
```

After running the above commands, the debug APK will be at:

[`frontend/android/app/build/outputs/apk/debug/app-debug.apk`](frontend/android/app/build/outputs/apk/debug/app-debug.apk)

### Install on Device

- **On a real device**: Transfer the APK file and open it to install. Enable "Install from unknown sources" if needed.
- **Using ADB** (if device/emulator is connected via USB with USB debugging enabled):
  ```bash
  cd frontend/android
  ./gradlew installDebug
  ```

### Build a Release APK (Signed)

For production release, you need a keystore file. Generate one and then build:

```bash
# Generate a keystore (one-time)
keytool -genkey -v -keystore site-ledger-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias site-ledger

# Build release APK
cd frontend/android
./gradlew assembleRelease
```

The release APK will be at:

[`frontend/android/app/build/outputs/apk/release/app-release.apk`](frontend/android/app/build/outputs/apk/release/app-release.apk)

> **Note**: The release APK must be signed before installing. The `assembleRelease` command signs it using the keystore if configured in the Gradle files.

### Open in Android Studio (Alternative)

If you prefer to build via Android Studio's UI:

```bash
cd frontend
npx cap open android
```

This opens the Android project in Android Studio, where you can build the APK via **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/register` | Register new user (admin only) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/owner` | Owner-level aggregated dashboard |
| GET | `/api/dashboard/site/{siteId}` | Site-level dashboard |

### Sites
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sites` | List all sites |
| GET | `/api/sites/{id}` | Get site details |
| POST | `/api/sites` | Create site |
| PUT | `/api/sites/{id}` | Update site |
| DELETE | `/api/sites/{id}` | Delete site |

### Ledger
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ledger/site/{siteId}` | Get site ledger entries |
| POST | `/api/ledger` | Create ledger entry |
| GET | `/api/ledger/site/{siteId}/category/{category}` | Filter by category |

### Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/materials/site/{siteId}` | Get site materials |
| POST | `/api/materials` | Create material |
| POST | `/api/materials/purchase` | Record material purchase |
| POST | `/api/materials/shift` | Record material shifting |
| POST | `/api/materials/consume` | Record material consumption |
| GET | `/api/materials/transactions/material/{materialId}` | Get material transactions |

### Labour
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/labour/site/{siteId}` | Get site labour entries |
| POST | `/api/labour` | Create labour entry |

### Advances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/advances/site/{siteId}` | Get site advances |
| POST | `/api/advances` | Create advance |
| POST | `/api/advances/{advanceId}/expense` | Add advance expense |
| GET | `/api/advances/{advanceId}/expenses` | Get advance expenses |
| POST | `/api/advances/{advanceId}/settle` | Settle advance |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/site/{siteId}` | Get site payments |
| POST | `/api/payments` | Create payment entry |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/site/{siteId}` | Get site documents |
| GET | `/api/documents/search/{documentType}` | Search by document type |
| POST | `/api/documents` | Upload document |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users (admin only) |
| GET | `/api/users/{id}` | Get user details |
| PUT | `/api/users/{id}/suspend` | Suspend user (admin only) |

## Role-Based Access

| Role | Permissions |
|------|-------------|
| **SUPER_ADMIN** | Full access, user management, site CRUD |
| **MANAGER** | View all, manage sites, ledger, materials |
| **SITE_INCHARGE** | Manage assigned site operations |
| **SUPERVISOR** | View site data, record labour & materials |
| **MUNSHI** | Record daily labour & material entries |
| **MATE** | View assigned tasks, record consumption |
| **STORE_KEEPER** | Manage material inventory |
| **ACCOUNTANT** | Manage payments, advances, ledger |

## License

This project is proprietary software.
