# External Integrations

**Analysis Date:** 2026-02-21

## APIs & External Services

**Email Service:**
- SMTP (Generic) - For transactional and report emails
  - SDK/Client: `nodemailer` 7.0.13
  - Configuration: `backend/src/modules/reportes/services/email.service.ts`
  - Auth: Environment variables
    - `SMTP_HOST` - Server hostname
    - `SMTP_PORT` - Server port (default: 587)
    - `SMTP_USER` - Authentication username
    - `SMTP_PASS` - Authentication password
    - `SMTP_FROM` - Sender email address (default: `reportes@clinical.com`)
  - Usage: Report delivery, automated email notifications
  - Fallback: Warnings logged if SMTP not configured; emails disabled gracefully

**Image CDN:**
- Two domains configured in `frontend/next.config.ts`:
  - `cdn.jsdelivr.net` - Open-source CDN
  - `avatars.githubusercontent.com` - GitHub avatars for user profiles

## Data Storage

**Databases:**
- PostgreSQL (Primary)
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma 6.1.0 (ORM)
  - Connection pooling: pgBouncer compatible
    - Enforced connection limit: 1 (`connection_limit=1`)
    - Pool timeout: 30 seconds (`pool_timeout=30`)
  - Schema: `backend/src/prisma/schema.prisma`
  - Migrations: Prisma migrations in `backend/src/prisma/migrations/`

**File Storage:**
- Local filesystem only (Currently)
  - File URLs stored in `Archivo` model
  - Supports: Consents, clinical history documents, presupuestos, invoices
  - No external storage integration (S3, Azure Blob, etc.) detected

**Caching:**
- Redis (Optional support available)
  - Package: `redis` 5.9.0
  - Adapter: `cache-manager-redis-yet` 5.1.5
  - Not actively configured in current deployment
  - Available for future cache implementation

## Authentication & Identity

**Auth Provider:**
- Custom JWT implementation

**Implementation Details:**
- Framework: Passport.js + @nestjs/jwt
- Strategy: `backend/src/modules/auth/strategies/jwt.strategy.ts`
- Token storage: Browser `localStorage`
  - `accessToken` - Short-lived JWT (15 minutes expiration)
  - `refreshToken` - Long-lived refresh token
  - `sessionId` - Session tracking identifier
- Token refresh: `POST /auth/refresh` endpoint with automatic retry queuing
- Guards: JWT authentication guard + role-based authorization
- Roles: ADMIN, PROFESIONAL, SECRETARIA, PACIENTE, FACTURADOR
- Logout: `POST /auth/logout` with session cleanup

**Frontend Integration:**
- Axios interceptor in `frontend/src/lib/api.ts`
  - Automatic token injection in request headers
  - 401 response handling with token refresh
  - Request queuing during token refresh to prevent race conditions
  - Auto-redirect to login on auth failure

**Backend CORS:**
- Configured for:
  - `http://localhost:3000` - Local development
  - `http://127.0.0.1:3000` - Local development alternate
  - `https://clinical-azure.vercel.app` - Production deployment
- Credentials: `true` (cookies supported)
- Tools without origin (curl, Postman) permitted

## Monitoring & Observability

**Error Tracking:**
- Not detected - No external error tracking service (Sentry, DataDog, etc.)
- Local error logging via NestJS Logger

**Logs:**
- Console logging via NestJS Logger
- Middleware: Audit logging middleware in `backend/src/common/middleware/audit.middleware.ts`
- No external log aggregation detected

**Database Logging:**
- Prisma client configured with optional query logging (via environment)
- PostgreSQL connection and pool status logged on module init

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel deployment
  - Production: `https://clinical-azure.vercel.app`
  - Redirects configured in `next.config.ts`:
    - `/dashboard/finanzas/pagos` → `/dashboard/finanzas/balance?tab=ingresos`
    - `/dashboard/finanzas/cuentas-corrientes` → `/dashboard/finanzas/balance?tab=cuentas`
    - `/dashboard/finanzas/reportes` → `/dashboard/finanzas/facturacion?tab=reportes`
    - `/dashboard/finanzas/liquidaciones` → `/dashboard/finanzas/facturacion?tab=liquidaciones`
- Backend: Not configured in analyzed files (likely separate deployment)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI config in repository

## Environment Configuration

**Required env vars - Backend:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret | 32+ character random string |
| `SMTP_HOST` | Email server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email authentication user | `user@example.com` |
| `SMTP_PASS` | Email authentication password | Generated app password |
| `SMTP_FROM` | Email from address | `reportes@clinical.com` |
| `PORT` | Server listening port | `3001` (default) |

**Required env vars - Frontend:**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |

**Secrets location:**
- Backend: `.env` file in `backend/` root
- Frontend: Environment variables in deployment platform (Vercel)
- Never committed to version control

## Data Integration Patterns

**API Communication:**
- Backend: NestJS REST endpoints
- Frontend: Axios HTTP client
- No GraphQL, WebSockets, or gRPC detected
- Request/response format: JSON

**Data Fetching:**
- TanStack Query for server state management
- Hook patterns: `use[Entity].ts` files in `frontend/src/hooks/`
- Examples: `usePacientes`, `usePaciente`, `useCreatePaciente`
- Query caching and synchronization via TanStack Query

**State Management:**
- Zustand stores for client state
- Location: `frontend/src/store/`
- Persisted to localStorage for auth tokens and preferences
- Professional context tracking for multi-tenant filtering

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints for external services

**Outgoing:**
- Email notifications (via nodemailer SMTP)
- Report delivery to user email addresses
- No external API callbacks detected

## Report Generation & Export

**PDF Export:**
- Library: PDFKit 0.17.2 (`@types/pdfkit` 0.17.4)
- Service: `backend/src/modules/reportes/services/reportes-export.service.ts`
- Formats: Financial reports, operational reports, CRM metrics
- Delivery: Email attachment or download

**Email Reports:**
- Service: `backend/src/modules/reportes/services/email.service.ts`
- Report types: Weekly summary, monthly summary, income, appointments, delinquency
- Frequency: Weekly or monthly
- Subscription model: `ReporteSuscripcion` table with schedule tracking

## Task Scheduling

**Scheduler:**
- Framework: @nestjs/schedule 6.1.0
- Service: `backend/src/modules/pacientes/seguimiento-scheduler.service.ts`
- Tasks: CRM follow-up task automation (EVERY_DAY_AT_9AM)
- Trigger: Daily scheduled job for patient follow-ups

---

*Integration audit: 2026-02-21*
