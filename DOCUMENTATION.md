# Ethiopia Federal Police — Integrated Crime Investigation System
## Full Project Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack Summary](#3-technology-stack-summary)
4. [Infrastructure — Docker & Docker Compose](#4-infrastructure--docker--docker-compose)
5. [Reverse Proxy — Nginx](#5-reverse-proxy--nginx)
6. [Backend — Flask (Python)](#6-backend--flask-python)
7. [Database — PostgreSQL](#7-database--postgresql)
8. [Frontend — Next.js (TypeScript)](#8-frontend--nextjs-typescript)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Data Models & Database Schema](#10-data-models--database-schema)
11. [API Reference](#11-api-reference)
12. [Frontend Pages & Routing](#12-frontend-pages--routing)
13. [Environment Variables](#13-environment-variables)
14. [CI/CD — GitHub Actions](#14-cicd--github-actions)
15. [Running the Project](#15-running-the-project)

---

## 1. Project Overview

The **Ethiopia Federal Police Integrated Crime Investigation Management System (CRIMS)** is a full-stack web application designed to digitize and streamline the Federal Police Department's case management workflow.

The system supports the entire lifecycle of a criminal case — from initial pre-investigation intake, through departmental assignment, investigator assignment, evidence and witness management, case submission, and final prosecutor review and decision.

### Core Features

| Feature | Description |
|---|---|
| Case Management | Create, track, assign, and transition cases through a defined workflow |
| Role-Based Access Control | Six distinct roles, each with their own dashboard and permissions |
| Person & Exhibit Registry | Attach witnesses, accusers, accused persons, and physical exhibits to cases |
| Department Management | Organize officers into departments with crime-type specializations |
| Daily Activity Logging | Investigators log daily work entries linked to cases |
| Analytics Dashboard | System-wide statistics on case volumes, resolution rates, and trends |
| Backup & Export | Admin-level backup endpoints |
| Multi-language Support | Built-in i18n (internationalization) framework in the frontend |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                       │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP :80
                           ▼
┌─────────────────────────────────────────────────────────┐
│               NGINX (Reverse Proxy)                      │
│  nginx:1.25-alpine  |  Container: nginx_federal          │
│                                                          │
│  /          → federal_front:3000  (Next.js)              │
│  /api       → federal:8000        (Flask)                │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐       ┌──────────────────────┐
│  Next.js 15 SSR  │       │  Flask + Gunicorn     │
│  Container:      │       │  Container: federal   │
│  federal_front   │       │  Port: 8000           │
│  Port: 3000      │       └──────────┬───────────┘
└──────────────────┘                  │
                                      ▼
                           ┌──────────────────────┐
                           │  PostgreSQL 16        │
                           │  Container:           │
                           │  postgres_federal     │
                           │  Port: 5432           │
                           └──────────────────────┘
```

### Docker Networks

| Network | Services Connected | Purpose |
|---|---|---|
| `api_net` | nginx, federal (backend), federal_front | Frontend ↔ Nginx ↔ Backend communication |
| `db_net` | federal (backend), postgres-federal | Backend ↔ Database communication |

---

## 3. Technology Stack Summary

| Layer | Technology | Version | Role |
|---|---|---|---|
| **Containerization** | Docker | Latest | Package every service into isolated containers |
| **Orchestration** | Docker Compose | v3 | Define and run multi-container application |
| **Reverse Proxy** | Nginx | 1.25-alpine | Single entry point, route splitting, header forwarding |
| **Frontend** | Next.js | 15.2.4 | React-based SSR/SSG web application |
| **Frontend Language** | TypeScript | ^5 | Type-safe JavaScript |
| **Frontend Runtime** | React | ^19 | UI component framework |
| **UI Components** | Radix UI + shadcn/ui | Various | Accessible, headless component primitives |
| **Styling** | Tailwind CSS | ^4.1.9 | Utility-first CSS |
| **Charts** | Recharts | Latest | Analytics data visualizations |
| **Form Handling** | React Hook Form + Zod | 7.60 / 3.25 | Forms with schema validation |
| **Toast Notifications** | Sonner | ^1.7.4 | Non-blocking UI notifications |
| **Theme** | next-themes | ^0.4.6 | Light/dark mode switching |
| **Backend** | Flask | 3.0.3 | Python micro web framework |
| **Backend Language** | Python | 3.12 | Application language |
| **WSGI Server** | Gunicorn | 22.0.0 | Production-grade Python WSGI HTTP server |
| **ORM** | Flask-SQLAlchemy | 3.1.1 | Database ORM layer |
| **DB Migrations** | Flask-Migrate (Alembic) | 4.0.5 | Database schema versioning |
| **Authentication** | Flask-JWT-Extended | 4.6.0 | JWT access token issuance and verification |
| **Password Hashing** | Flask-Bcrypt | 1.0.1 | Secure bcrypt password storage |
| **CORS** | Flask-Cors | 5.0.0 | Cross-Origin Resource Sharing headers |
| **Database** | PostgreSQL | 16 | Relational database |
| **DB Driver** | psycopg2-binary | 2.9.9 | Python ↔ PostgreSQL adapter |
| **Config** | python-dotenv | 1.0.1 | .env file loading |

---

## 4. Infrastructure — Docker & Docker Compose

### File: `docker-compose.yml`

The compose file defines **4 services**, **1 named volume**, and **2 networks**.

#### Services

**postgres-federal**
- Image: `postgres:16`
- Container name: `postgres_federal`
- Exposes port `5432` to host (and `db_net`)
- Persists data to the named volume `federal_data` at `/var/lib/postgresql/data`
- Environment: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

**federal (Backend)**
- Built from `./fedral_police_department-managment_system_backend/Dockerfile`
- Container name: `federal`
- Depends on `postgres-federal` (starts after)
- Loads environment variables from root `.env`
- Exposes port `8080` (host) → `8000` (container, where Gunicorn binds)
- Connected to both `api_net` and `db_net`

**federal_front (Frontend)**
- Built from `./integeratd-crime-investigation-system-.../Dockerfile`
- Container name: `federal_front`
- Loads environment variables from root `.env`
- Exposes port `3000`
- Connected to `api_net`

**nginx**
- Image: `nginx:1.25-alpine`
- Container name: `nginx_federal`
- Depends on `federal` and `federal_front`
- Mounts `./nginx/nginx.conf` as read-only
- Exposes port `80` (the public entry point)
- Connected to `api_net`

#### Named Volume

`federal_data` — persists PostgreSQL data across container restarts.

---

## 5. Reverse Proxy — Nginx

### File: `nginx/nginx.conf`

Nginx acts as the single public-facing entry point on port 80 and routes requests to the correct upstream service.

```
GET /          → proxied to http://federal_front:3000    (Next.js frontend)
GET /api/*     → proxied to http://federal:8000          (Flask backend)
```

All proxy requests forward the following headers:
- `Host` — original host header
- `X-Real-IP` — client's real IP address
- `X-Forwarded-For` — full client IP chain
- `X-Forwarded-Proto` — original protocol (http/https)

**Key settings:**
- `worker_processes auto` — automatically scales workers to available CPU cores
- `worker_connections 1024` — max simultaneous connections per worker
- `keepalive_timeout 65` — connection keep-alive duration in seconds

---

## 6. Backend — Flask (Python)

### Directory: `fedral_police_department-managment_system_backend/`

```
app/
├── __init__.py          # App factory (create_app), blueprint registration, CORS, extensions
├── config.py            # Config classes (Development / Production), DB URL normalization
├── extensions.py        # Shared extensions: db, migrate, bcrypt, jwt
├── models/
│   ├── user.py          # User model + police rank enum
│   ├── role.py          # Role model (admin, investigator, prosecutor, etc.)
│   ├── case.py          # Case model + status machine + auto-generated CR/DER numbers
│   ├── person.py        # Person model (witness / accuser / accused)
│   ├── exhibit.py       # Exhibit/evidence model with file upload support
│   ├── department.py    # Department model with JSON-encoded crime type list
│   └── daily_activity.py # Daily work log for investigators
├── routes/
│   ├── auth_routes.py
│   ├── user_routes.py
│   ├── case_routes.py
│   ├── department_routes.py
│   ├── person_exhibit_routes.py
│   ├── daily_activity_routes.py
│   ├── analytics_routes.py
│   ├── dashboard_routes.py
│   └── backup_routes.py
├── services/
│   ├── auth_service.py
│   ├── case_service.py
│   ├── user_service.py
│   ├── department_service.py
│   └── daily_activity_service.py
├── middleware/
│   ├── auth_required.py     # JWT verification decorator
│   └── role_required.py     # Role-based access control decorator
├── utils/
│   ├── jwt_utils.py
│   └── password_utils.py
└── seed/
    ├── seed.py              # CLI seed commands (flask seed all)
    ├── admin.json
    ├── demo_cases.json
    ├── demo_departments.json
    ├── demo_exhibits.json
    ├── demo_persons.json
    └── demo_users.json
```

### Application Factory (`app/__init__.py`)

Uses the **factory pattern** (`create_app()`). This:
- Initializes all extensions (SQLAlchemy, Migrate, Bcrypt, JWT)
- Enables CORS for all routes
- Registers all blueprints with their URL prefixes
- Ensures the upload folder exists at startup
- Registers CLI seed commands (`flask seed all`)

### Configuration (`app/config.py`)

| Class | `APP_ENV` value | Purpose |
|---|---|---|
| `DevelopmentConfig` | `development` (default) | `DEBUG=True` |
| `ProductionConfig` | `production` | `DEBUG=False` |

Key config values loaded from environment:
- `SECRET_KEY` — Flask secret key
- `DATABASE_URL` — PostgreSQL connection string (auto-normalizes `postgres://` → `postgresql+psycopg2://`)
- `JWT_SECRET_KEY` — JWT signing key
- `JWT_EXPIRES_MINUTES` — Token expiry (default: 7000 minutes)
- `UPLOAD_FOLDER` — Directory for uploaded files

### Dockerfile (Backend)

- Base image: `python:3.12-slim`
- Installs `build-essential` and `libffi-dev` for bcrypt compilation
- Copies and installs `requirements.txt` as a separate layer for cache efficiency
- Exposes port `8000`
- On startup: runs `flask seed all` to seed initial data, then launches Gunicorn
- Gunicorn config: `GUNICORN_WORKERS=3`, `GUNICORN_BIND=0.0.0.0:8000`, `GUNICORN_TIMEOUT=60`
- Includes a TCP healthcheck

---

## 7. Database — PostgreSQL

- Version: **PostgreSQL 16**
- Driver: **psycopg2-binary 2.9.9**
- ORM: **SQLAlchemy** (via Flask-SQLAlchemy 3.1.1)
- Migrations: **Alembic** (via Flask-Migrate 4.0.5)

### Tables

| Table | Model Class | Description |
|---|---|---|
| `roles` | `Role` | System roles (admin, investigator, etc.) |
| `departments` | `Department` | Police departments with crime specializations |
| `users` | `User` | Officers/staff with rank, role, and department |
| `cases` | `Case` | Criminal cases with unique CR and DER numbers |
| `persons` | `Person` | People linked to cases (witness/accuser/accused) |
| `exhibits` | `Exhibit` | Physical evidence linked to cases |
| `daily_activities` | `DailyActivity` | Investigator daily work logs |

### Key Design Decisions

- **Case identifiers**: Each case gets two auto-generated unique 10-digit numeric strings — `cr_number` (Crime Report number) and `der_number` (Detection Evidence Report number). Generated via `secrets.choice` at `before_insert` SQLAlchemy event, checked for uniqueness in the DB.
- **Department crimes**: Stored as a JSON-encoded text column (`TEXT`) in the `departments` table, exposed as a Python `list[str]` via a property.
- **Police ranks**: Enforced as a DB-level `ENUM` type (`rank_enum`) with 16 valid ranks from Constable to Commissioner General.
- **File uploads**: Person and exhibit files are stored on disk under `uploads/<case_der_number>/persons/` or `.../exhibits/`. Relative paths are persisted in `file_url` columns.
- **Data persistence**: Docker volume `federal_data` is mounted to `/var/lib/postgresql/data`, so data survives container restarts.

---

## 8. Frontend — Next.js (TypeScript)

### Directory: `integeratd-crime-investigation-system-.../`

```
app/                          # Next.js App Router
├── layout.tsx                # Root layout (Geist fonts, metadata, Providers wrapper)
├── page.tsx                  # Landing/home page
├── providers.tsx             # Global providers (Language, Config)
├── globals.css               # Global CSS
├── auth/                     # Login page
├── dashboard/                # Shared dashboard entry
├── admin/
│   ├── users/                # User management (CRUD)
│   ├── departments/          # Department management
│   ├── reports/              # Admin analytics/reports
│   └── backup/               # Database backup
├── department-head/
│   ├── assign/               # Assign investigator to case
│   ├── assign-prosecutor/    # Assign prosecutor to submitted case
│   ├── daily-activity/       # View investigator activity logs
│   └── pending/              # Pending/submitted cases queue
├── investigator/
│   ├── my-cases/             # Assigned cases view
│   └── reports/              # Investigator daily activity reports
├── prosecutor/
│   ├── review/               # Cases under review
│   └── decisions/            # Accept/reject/reinvestigate decisions
├── pre-investigation/        # Initial case intake (create new case)
├── about/                    # About page
├── contact/                  # Contact page
├── reviews/                  # (Placeholder/reviews section)
└── settings/                 # User settings

components/
├── admin/                    # Admin-specific components
├── auth/                     # Login form, auth guard
├── dashboards/               # Role-specific dashboard components
├── department-head/          # Department head UI
├── investigator/             # Investigator-specific components
├── pre-investigation/        # Case intake form components
├── prosecutor/               # Prosecutor review components
├── layout/                   # Shared layout: sidebar, navbar, etc.
├── home/                     # Landing page components
├── settings/                 # Settings components
├── ui/                       # shadcn/ui primitive components
└── theme-provider.tsx        # next-themes wrapper

contexts/
├── config-context.tsx        # Runtime config (API base URL) via React Context
└── language-context.tsx      # App language state

lib/
├── config.ts                 # BASE_URL resolution (server vs client env vars)
├── i18n.tsx                  # Internationalization language provider
└── utils.ts                  # Tailwind class utilities (clsx + tailwind-merge)

hooks/                        # Custom React hooks
styles/                       # Additional style files
public/                       # Static assets
```

### Key Libraries

| Library | Purpose |
|---|---|
| **Next.js 15** | App Router, SSR, standalone Docker output |
| **React 19** | UI framework |
| **TypeScript 5** | Static typing |
| **Tailwind CSS 4** | Utility-first styling |
| **Radix UI** | Accessible headless primitives (Dialog, Select, Tabs, etc.) |
| **shadcn/ui** | Pre-built component layer on top of Radix UI |
| **Recharts** | Charts for analytics dashboard |
| **React Hook Form** | Performant form state management |
| **Zod** | Schema-based form validation |
| **Sonner** | Toast notification system |
| **next-themes** | Dark/light theme support |
| **Lucide React** | Icon set |
| **date-fns** | Date formatting and manipulation |
| **Geist** | Vercel's Geist Sans and Mono fonts |
| **cmdk** | Command palette component |

### Dockerfile (Frontend)

Multi-stage build with 3 stages:
1. **deps** — installs all node dependencies using pnpm (with corepack), npm fallback
2. **builder** — runs `next build` with `output: "standalone"` to produce a minimal server
3. **runner** — copies only the standalone server, static assets, and public files; runs as non-root user `nextjs`; node version: 20-alpine

The `output: "standalone"` config in `next.config.mjs` produces a self-contained `server.js` that doesn't require the full `node_modules` at runtime, keeping the Docker image lean.

---

## 9. Authentication & Authorization

### Authentication Flow

1. Client sends `POST /api/auth/login` with `{ identifier, password }` (`identifier` can be email or username)
2. `AuthService.login()` looks up user, verifies bcrypt password hash
3. A JWT access token is issued via `Flask-JWT-Extended`, signed with `JWT_SECRET_KEY`
4. Token payload includes `sub` (user ID) and `role` as an additional claim
5. Client stores the token and sends it as `Authorization: Bearer <token>` on all subsequent requests
6. `@auth_required` decorator validates the token on each protected route
7. `@role_required(...)` decorator checks the `role` claim against allowed roles

### Roles

| Role Name | Description |
|---|---|
| `admin` | Full system access — manage users, departments, all cases |
| `department_head` | View and assign cases within their department |
| `pre_investigation` | Initial case intake — create new cases |
| `investigator` | Work on assigned cases — add persons, exhibits, daily logs, submit |
| `prosecutor` | Review submitted cases — accept, reject, or request reinvestigation |
| `user` | Default minimal role (placeholder) |

### Middleware

**`auth_required`** — wraps `@jwt_required()` from Flask-JWT-Extended. All routes except `POST /api/auth/login` require a valid JWT.

**`role_required(*roles)`** — reads the `role` claim from the current JWT and rejects the request with `403 Forbidden` if the role is not in the allowed list.

---

## 10. Data Models & Database Schema

### User

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `username` | String(80) | Unique, indexed |
| `first_name` | String(80) | Required |
| `last_name` | String(80) | Required |
| `rank` | Enum | 16 police ranks from Constable to Commissioner General |
| `email` | String(120) | Unique, indexed |
| `password_hash` | String(128) | bcrypt hash |
| `status` | String(32) | `active` / `inactive`, default `inactive` |
| `created_at` | DateTime | Auto |
| `department_id` | FK → departments.id | Optional |
| `role_id` | FK → roles.id | Optional |

### Case

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | |
| `cr_number` | String(10) | Unique, auto-generated 10-digit |
| `der_number` | String(10) | Unique, auto-generated 10-digit |
| `title` | String(255) | Required |
| `crime` | String(500) | Required |
| `status` | String(50) | One of 10 valid statuses |
| `department_id` | FK → departments.id | |
| `current_assigned_investigator_id` | FK → users.id | |
| `current_assigned_prosecutor_id` | FK → users.id | |
| `pre_investigator_id` | FK → users.id | The officer who opened the case |
| `submitted_by_investigator` | Boolean | |
| `note` | Text | General note |
| `prosecutor_note` | Text | Prosecutor-specific note |
| `reported_date` | DateTime | |

### Case Status Workflow

```
new
 └─ investigating        (assigned to investigator)
     └─ submitted        (investigator submits)
         └─ under_prosecutor_review
             ├─ accepted_by_prosecutor   (terminal)
             ├─ rejected_by_prosecutor   (terminal)
             ├─ request_reinvestigation
             │   └─ reopened → investigating ...
             └─ rejected                 (terminal)
closed                                   (terminal)
```

### Person

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | |
| `case_der_number` | FK → cases.der_number | String FK |
| `type` | String(20) | `witness`, `accuser`, or `accused` |
| `full_name` | String(255) | Required |
| `date_of_birth`, `age`, `gender` | Various | Personal info |
| `address`, `region`, `woreda`, `kebele` | String | Ethiopian administrative divisions |
| `file_url` | String(500) | Uploaded document path |

### Exhibit

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | |
| `case_der_number` | FK → cases.der_number | |
| `name` | String(255) | Required |
| `description` | Text | |
| `quantity` | Integer | |
| `related_person_id` | FK → persons.id | Optional link |
| `file_url` | String(500) | Uploaded file path |
| `registered_date` | DateTime | |

### Department

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | |
| `name` | String(120) | Unique |
| `description` | Text | |
| `crimes` | Text (JSON) | Stored as JSON list of crime type strings |
| `is_active` | Boolean | Default `True` |

### DailyActivity

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | |
| `activity_date` | Date | Indexed |
| `case_der_number` | String(10) | Optional case reference |
| `investigator_id` | FK → users.id | Who created the log |
| `description` | Text | Required |

---

## 11. API Reference

All API endpoints are prefixed with `/api`. JWT token required on all routes unless marked public.

### Authentication — `/api/auth`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/auth/login` | Public | — | Login with email/username + password. Returns JWT token + user object |
| POST | `/api/auth/register` | Required | `admin` | Register a new user (admin only) |

**Login Request:**
```json
{ "identifier": "email_or_username", "password": "secret" }
```
**Login Response:**
```json
{
  "access_token": "eyJ...",
  "user": { "id": 1, "email": "...", "username": "...", "role": "admin", "rank": "Inspector", "status": "active" }
}
```

---

### Users — `/api/users`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/users/` | Any authenticated | List all users |
| POST | `/api/users/` | `admin` | Create a new user |
| PUT | `/api/users/` | `admin` | Update a user (by email in body) |
| DELETE | `/api/users/<id>` | `admin` | Delete a user |
| GET | `/api/users/me` | Any authenticated | Get currently authenticated user's profile |
| GET | `/api/users/all_investigators` | `department_head` | List investigators in the head's department |
| GET | `/api/users/all_prosecutors` | `department_head` | List prosecutors in the head's department |

---

### Cases — `/api/cases`

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/cases/` | `pre_investigation` | Create a new case |
| GET | `/api/cases/` | Any authenticated | List all cases |
| GET | `/api/cases/<id>` | Any authenticated | Get case by ID |
| PUT | `/api/cases/<id>` | `investigator`, `admin` | Update case |
| DELETE | `/api/cases/<id>` | `admin` | Delete case |
| GET | `/api/cases/statuses` | Any authenticated | List all valid case statuses |
| GET | `/api/cases/pre_investigation-cases` | `pre_investigation` | Cases opened by the current user |
| GET | `/api/cases/investigator/assigned_cases` | `investigator` | Cases assigned to the current investigator |
| POST | `/api/cases/investigator/submitcase` | `investigator`, `admin` | Submit a case for prosecutor review |
| GET | `/api/cases/department-head/new-or-rejected-cases` | `department_head` | New/rejected cases in own department |
| GET | `/api/cases/department-head/department-cases` | `department_head` | All cases in own department |
| GET | `/api/cases/department-head/submitted-cases` | `department_head` | Submitted cases in own department |
| POST | `/api/cases/department_head/assign_investigator` | `department_head` | Assign an investigator to a case |
| POST | `/api/cases/<id>/submit_case` | `investigator`, `admin` | (Deprecated) Submit case via path param |
| POST | `/api/cases/<id>/request_reinvestigation` | `prosecutor`, `admin` | Request case reinvestigation |
| POST | `/api/cases/<id>/reject_case` | `prosecutor`, `admin` | Reject a case |

---

### Departments — `/api/departments`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/departments/` | Any authenticated | List all departments |
| POST | `/api/departments/` | `admin` | Create a department |
| PUT | `/api/departments/<id>` | `admin` | Update a department |
| DELETE | `/api/departments/<id>` | `admin` | Delete a department |

---

### Persons & Exhibits — `/api`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/cases/<der_number>/persons` | Any authenticated | List persons for a case |
| POST | `/api/cases/<der_number>/persons` | `investigator`, `admin` | Add a person to a case (supports file upload) |
| PUT | `/api/persons/<id>` | `investigator`, `admin` | Update a person |
| DELETE | `/api/persons/<id>` | `investigator`, `admin` | Delete a person |
| GET | `/api/cases/<der_number>/exhibits` | Any authenticated | List exhibits for a case |
| POST | `/api/cases/<der_number>/exhibits` | `investigator`, `admin` | Add an exhibit to a case (supports file upload) |
| PUT | `/api/exhibits/<id>` | `investigator`, `admin` | Update an exhibit |
| DELETE | `/api/exhibits/<id>` | `investigator`, `admin` | Delete an exhibit |

---

### Daily Activities — `/api`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/activities/` | Any authenticated | List all activities |
| POST | `/api/activities/` | `investigator` | Log a new daily activity |
| GET | `/api/activities/<id>` | Any authenticated | Get a specific activity |
| DELETE | `/api/activities/<id>` | `investigator`, `admin` | Delete an activity |

---

### Analytics — `/api/analytics`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/analytics/` | `admin` | System-wide analytics (totals, case status, trends, department breakdown, user activity) |

**Analytics Response Shape:**
```json
{
  "data": {
    "totals": { "totalCases": 120, "resolvedCases": 45, "pendingCases": 75, "resolutionRate": 37.5 },
    "casesByDepartment": [ { "name": "Homicide", "cases": 30, "color": "#1f77b4" } ],
    "monthlyTrends": [ { "month": "2026-01", "cases": 20, "resolved": 8 } ],
    "caseStatus": [ { "status": "investigating", "count": 40 } ],
    "userActivity": [ { "user": "John Doe", "actions": 15, "lastActive": "2026-06-01T..." } ]
  }
}
```

---

### Dashboard — `/api/dashboard`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/dashboard/` | Any authenticated | Role-aware dashboard summary data |

---

### Backup — `/api/backup`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/backup/` | `admin` | Trigger/download database backup |

---

## 12. Frontend Pages & Routing

The frontend uses the **Next.js 15 App Router**. Each folder under `app/` with a `page.tsx` file becomes a route. All requests go through `app/layout.tsx`, which wraps everything in the global `Providers` (Language + Config contexts).

### Route Map

| URL Path | Section | Description |
|---|---|---|
| `/` | Home | Landing page with system overview |
| `/auth` | Auth | Login page |
| `/dashboard` | All roles | Entry dashboard (redirects by role) |
| `/admin/users` | Admin | User management — create, edit, delete officers |
| `/admin/departments` | Admin | Department management |
| `/admin/reports` | Admin | System analytics and reports |
| `/admin/backup` | Admin | Database backup tools |
| `/department-head/assign` | Department Head | Assign investigators to new/rejected cases |
| `/department-head/assign-prosecutor` | Department Head | Assign prosecutors to submitted cases |
| `/department-head/pending` | Department Head | View all pending cases in department |
| `/department-head/daily-activity` | Department Head | View investigator daily activity logs |
| `/pre-investigation` | Pre-Investigation Officer | Create and track newly opened cases |
| `/investigator/my-cases` | Investigator | View assigned cases, add persons/exhibits, log activity |
| `/investigator/reports` | Investigator | View personal daily activity reports |
| `/prosecutor/review` | Prosecutor | Review submitted cases with full case details |
| `/prosecutor/decisions` | Prosecutor | Accept, reject, or request reinvestigation |
| `/settings` | All | User profile and app settings |
| `/about` | Public | About page |
| `/contact` | Public | Contact page |

### State Management

No external state library (Redux, Zustand) — state is managed via:
- **React Context API** — two global contexts:
  - `ConfigContext` — provides runtime configuration (API base URL) to all components
  - `LanguageContext` — provides current language selection and translation functions
- **`lib/config.ts`** — resolves the API base URL at module load time, handling both server-side (can use `API_BASE_URL`) and client-side (uses `NEXT_PUBLIC_API_BASE_URL`) environments
- **`lib/i18n.tsx`** — internationalization provider with language switching support
- **React Hook Form** — local form state for all forms

### Theme

- Supports light and dark mode via `next-themes`
- `theme-provider.tsx` wraps the application with the theme context

### API Communication

All API calls use `fetch()` or a custom wrapper that reads `BASE_URL` from `lib/config.ts`. The base URL points to `/api` (same-origin via Nginx proxy in production, or the environment-configured URL in development).

---

## 13. Environment Variables

### Root `.env` (loaded by Docker Compose for all services)

| Variable | Used By | Description |
|---|---|---|
| `SECRET_KEY` | Backend | Flask secret key |
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Backend | JWT token signing key |
| `JWT_EXPIRES_MINUTES` | Backend | Token expiry in minutes |
| `UPLOAD_FOLDER` | Backend | Path for uploaded files |
| `APP_ENV` | Backend | `production` or `development` |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend (client) | Public API base URL (accessible in browser) |
| `API_BASE_URL` | Frontend (server) | Server-side API base URL (SSR only) |

### Backend `.env` (local dev override)

Located at `fedral_police_department-managment_system_backend/.env`. Same variables as root `.env`, used when running the backend directly (outside Docker).

### Frontend `.env` (local dev override)

Located at `integeratd-crime-investigation-system-.../.env`. Contains `NEXT_PUBLIC_API_BASE_URL` for local development.

> **Security note:** Never commit real secrets to version control. Both `.env` files are listed in `.gitignore`. Use `example.env` files (included in both directories) as templates.

---

## 14. CI/CD — GitHub Actions

### File: `.github/workflows/docker-deploy.yml`

The backend includes a GitHub Actions workflow for automated Docker deployment. It typically:
- Triggers on push to the main branch
- Builds the Docker image
- Pushes to a container registry (Docker Hub or similar)
- Optionally deploys to a remote server via SSH

---

## 15. Running the Project

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### 1. Clone the repository

```bash
git clone <repo-url>
cd crims
```

### 2. Set up environment variables

Copy the example files and fill in your values:

```bash
cp fedral_police_department-managment_system_backend/example.env .env
```

Minimum required values in `.env`:

```env
SECRET_KEY=your-flask-secret-key
DATABASE_URL=postgresql+psycopg2://myuser:mypass@postgres-federal:5432/mydb
JWT_SECRET_KEY=your-jwt-secret-key
NEXT_PUBLIC_API_BASE_URL=http://localhost/api
APP_ENV=production
```

### 3. Start all services

```bash
docker compose up --build
```

This command:
1. Builds the Flask backend image
2. Builds the Next.js frontend image
3. Starts PostgreSQL
4. Runs `flask seed all` on first backend startup to seed roles, an admin user, departments, sample cases, persons, and exhibits
5. Starts Nginx on port 80

### 4. Access the application

| Service | URL |
|---|---|
| Web Application | http://localhost |
| Backend API (direct) | http://localhost:8080 |
| PostgreSQL (direct) | localhost:5432 |

### 5. Default admin credentials

Seeded by `flask seed all` from `app/seed/admin.json`. Check that file for the default admin email and password, or look at `app/seed/demo_users.json` for other seeded users.

### 6. Stop the application

```bash
docker compose down
```

To also remove the database volume (destroys all data):

```bash
docker compose down -v
```

---

### Local Development (without Docker)

**Backend:**
```bash
cd fedral_police_department-managment_system_backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Set DATABASE_URL in .env to point to a local Postgres instance
flask db upgrade                # Run migrations
flask seed all                  # Seed initial data
python run.py                   # Start dev server on port 5000
```

**Frontend:**
```bash
cd integeratd-crime-investigation-system-...
npm install                     # or pnpm install
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:5000 in .env
npm run dev                     # Start on http://localhost:3000
```

**Database Migrations:**
```bash
cd fedral_police_department-managment_system_backend
flask db migrate -m "description"   # Generate migration
flask db upgrade                     # Apply migration
flask db downgrade                   # Roll back last migration
```

---

## Project Summary

| Concern | Solution |
|---|---|
| Containerization | Docker + Docker Compose |
| Service routing | Nginx reverse proxy |
| Frontend | Next.js 15 (React 19, TypeScript 5, Tailwind CSS 4) |
| UI Components | Radix UI / shadcn/ui |
| Backend | Flask 3 + Gunicorn (Python 3.12) |
| Database | PostgreSQL 16 with SQLAlchemy ORM |
| Auth | JWT (Flask-JWT-Extended) + bcrypt password hashing |
| Authorization | Role-based decorators (6 roles) |
| File storage | Local filesystem under `uploads/` |
| Migrations | Flask-Migrate (Alembic) |
| Seeding | Custom `flask seed all` CLI command |
| CI/CD | GitHub Actions (Docker build + deploy) |
| Internationalization | Custom i18n context with language switching |
