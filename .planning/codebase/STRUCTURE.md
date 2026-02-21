# Codebase Structure

**Analysis Date:** 2026-02-21

## Directory Layout

```
CLINICAL/
├── backend/                                # NestJS API server
│   ├── src/
│   │   ├── modules/                       # Feature modules (NestJS pattern)
│   │   │   ├── auth/                      # Authentication & authorization
│   │   │   ├── pacientes/                 # Patient management + CRM
│   │   │   ├── turnos/                    # Appointment scheduling
│   │   │   ├── historia-clinica/          # Clinical records
│   │   │   ├── finanzas/                  # Financial operations
│   │   │   ├── presupuestos/              # Quotes/budgets
│   │   │   ├── reportes/                  # Reports & analytics
│   │   │   ├── stock/                     # Inventory management
│   │   │   ├── profesionales/             # Medical professionals
│   │   │   ├── usuarios/                  # User management
│   │   │   ├── obras-sociales/            # Health insurance plans
│   │   │   ├── tratamientos/              # Treatment catalog
│   │   │   ├── tipos-turno/               # Appointment types config
│   │   │   ├── cuentas-corrientes/        # Patient account balances
│   │   │   ├── cuentas-corrientes-proveedores/  # Supplier accounts
│   │   │   ├── mensajes-internos/         # Internal messaging
│   │   │   ├── alertas/                   # System alerts
│   │   │   └── hc-templates/              # Clinical record templates
│   │   ├── prisma/                        # Database ORM
│   │   │   ├── schema.prisma              # Data model definitions
│   │   │   ├── migrations/                # Database migrations
│   │   │   ├── prisma.service.ts          # Prisma client wrapper
│   │   │   └── ERD/                       # Entity relationship diagrams
│   │   ├── common/                        # Shared utilities & middleware
│   │   │   ├── middleware/                # Express middleware (audit logging)
│   │   │   ├── pipes/                     # Custom validation pipes
│   │   │   ├── guards/                    # Auth guards (non-JWT)
│   │   │   ├── decorators/                # Custom decorators
│   │   │   ├── scope/                     # Professional context resolver
│   │   │   ├── constants/                 # App-wide constants
│   │   │   ├── types/                     # TypeScript type definitions
│   │   │   └── utils/                     # Helper functions
│   │   ├── diagnosticos/                  # Diagnosis module (standalone)
│   │   ├── prisma-client-exception/       # Global error filter for DB
│   │   ├── app.module.ts                  # Root module (imports all features)
│   │   └── main.ts                        # Bootstrap entry point
│   ├── package.json                       # Backend dependencies
│   └── tsconfig.json                      # TypeScript config
│
├── frontend/                              # Next.js 16 + React 19 UI
│   ├── src/
│   │   ├── app/                           # Next.js App Router (file-based routing)
│   │   │   ├── dashboard/                 # Protected dashboard layout & routes
│   │   │   │   ├── pacientes/             # Patient management pages
│   │   │   │   │   ├── page.tsx           # Patient list (embudo/lista toggle)
│   │   │   │   │   ├── [id]/              # Patient detail pages
│   │   │   │   │   │   ├── page.tsx       # Patient overview
│   │   │   │   │   │   └── cuenta-corriente/  # Patient account details
│   │   │   │   │   ├── components/        # Patient-specific components
│   │   │   │   │   └── *.tsx              # Patient modals/forms
│   │   │   │   ├── turnos/                # Appointment calendar
│   │   │   │   │   ├── page.tsx           # Calendar view
│   │   │   │   │   └── *.tsx              # Appointment modals
│   │   │   │   ├── finanzas/              # Financial pages
│   │   │   │   │   ├── facturacion/       # Invoicing
│   │   │   │   │   ├── pagos/             # Payment tracking
│   │   │   │   │   ├── presupuestos/      # Quote management
│   │   │   │   │   ├── cuentas-corrientes/  # Account balances
│   │   │   │   │   ├── liquidaciones/     # Insurance settlements
│   │   │   │   │   ├── reportes/          # Financial reports
│   │   │   │   │   ├── balance/           # Balance sheet
│   │   │   │   │   ├── proveedores/       # Supplier management
│   │   │   │   │   └── components/        # Finance widgets
│   │   │   │   ├── stock/                 # Inventory pages
│   │   │   │   ├── reportes/              # Operational reports
│   │   │   │   │   ├── operativos/        # Turnos, ventas, ausentismo
│   │   │   │   │   ├── financieros/       # Ingresos, cuentas
│   │   │   │   │   └── components/        # Report widgets
│   │   │   │   ├── configuracion/         # Settings pages
│   │   │   │   ├── components/            # Dashboard-level components
│   │   │   │   │   ├── CRMFunnelWidget.tsx   # CRM visualization
│   │   │   │   │   ├── CRMKpiCards.tsx       # CRM metrics
│   │   │   │   │   └── *.tsx              # Navigation, widgets
│   │   │   │   ├── layout.tsx             # Dashboard layout (auth guard)
│   │   │   │   └── page.tsx               # Dashboard homepage
│   │   │   ├── login/                     # Authentication pages
│   │   │   │   └── page.tsx               # Login form
│   │   │   ├── layout.tsx                 # Root layout (fonts, providers, Toaster)
│   │   │   ├── page.tsx                   # Root page (redirect)
│   │   │   └── providers.tsx              # Context providers (QueryClientProvider)
│   │   ├── components/                    # Reusable React components
│   │   │   ├── ui/                        # shadcn/ui base components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   └── ... (20+ shadcn components)
│   │   │   ├── data-table/                # Reusable data table
│   │   │   ├── crm/                       # CRM-specific components
│   │   │   │   ├── KanbanBoard.tsx        # CRM funnel kanban
│   │   │   │   ├── KanbanColumn.tsx
│   │   │   │   ├── PatientCard.tsx
│   │   │   │   ├── LossReasonModal.tsx
│   │   │   │   ├── TemperatureSelector.tsx
│   │   │   │   └── CRMMetricsBar.tsx
│   │   │   ├── live-turno/                # Real-time consultation components
│   │   │   │   ├── LiveTurnoPanel.tsx
│   │   │   │   ├── LiveTurnoIndicator.tsx
│   │   │   │   └── ... (session, timer, recovery, sync)
│   │   │   ├── mensajes/                  # Internal messaging components
│   │   │   ├── hc-templates/              # Clinical record template UI
│   │   │   ├── patient/                   # Patient-specific components
│   │   │   ├── AutocompletePaciente.tsx   # Shared patient autocomplete
│   │   │   ├── DiagnosticoCombobox.tsx    # Diagnosis selector
│   │   │   ├── PlanCombobox.tsx           # Insurance plan selector
│   │   │   ├── TratamientosCombobox.tsx   # Treatment selector
│   │   │   ├── ProfessionalSelector.tsx   # Professional context selector
│   │   │   ├── PhotoUploader.tsx          # Image upload component
│   │   │   └── ... (20+ custom components)
│   │   ├── hooks/                         # React Query hooks + custom hooks
│   │   │   ├── usePacientes.ts            # Query: list all patients
│   │   │   ├── usePaciente.ts             # Query: single patient detail
│   │   │   ├── useCreatePaciente.ts       # Mutation: create patient
│   │   │   ├── useAgenda.ts               # Query: appointment slots
│   │   │   ├── useTurnosRangos.ts         # Query: available time ranges
│   │   │   ├── useCobrarTurno.ts          # Mutation: mark appointment paid
│   │   │   ├── useFinanzas.ts             # Query: financial dashboard KPIs
│   │   │   ├── useCRMKanban.ts            # Query: CRM funnel data
│   │   │   ├── useUpdateEtapaCRM.ts       # Mutation: move patient in funnel
│   │   │   ├── useUpdateTemperatura.ts    # Mutation: set patient temperature
│   │   │   ├── useCRMMetrics.ts           # Query: CRM KPI cards data
│   │   │   ├── useEffectiveProfessionalId.ts  # Determine current professional context
│   │   │   ├── useCurrentUser.ts          # Query: logged-in user profile
│   │   │   ├── useHistoriaClinica.ts      # Query: clinical records
│   │   │   ├── useHCEntries.ts            # Query: clinical entries list
│   │   │   ├── useHCTemplates.ts          # Query/Mutation: clinical templates
│   │   │   ├── useExportReporte.ts        # Mutation: export reports to CSV
│   │   │   ├── useReportesDashboard.ts    # Query: dashboard KPIs
│   │   │   ├── useReportesOperativos.ts   # Query: operational reports
│   │   │   ├── useReportesFinancieros.ts  # Query: financial reports
│   │   │   ├── useLiveTurnoActions.ts     # Mutations: start/end sessions
│   │   │   ├── useObrasSociales.ts        # Query: insurance plans
│   │   │   ├── useMensajesChats.ts        # Query: message threads
│   │   │   └── ... (50+ hooks total)
│   │   ├── lib/                           # Utility libraries
│   │   │   ├── api.ts                     # Axios instance + JWT interceptor + token refresh
│   │   │   ├── utils.ts                   # Helper functions (formatting, validation)
│   │   │   ├── permissions.ts             # Role-based route access checker
│   │   │   └── stores/                    # Zustand stores
│   │   │       └── useUIStore.ts          # UI state (sidebar, focus mode)
│   │   ├── store/                         # Zustand state management
│   │   │   ├── professional-context.store.ts  # Selected professional ID
│   │   │   ├── live-turno.store.ts        # Active session state
│   │   │   ├── mensajes-internos.store.ts # Message UI state
│   │   │   └── template-wizard.store.ts   # Clinical template wizard state
│   │   ├── providers/                     # React context providers
│   │   │   └── MensajesProvider.tsx       # Global messaging context
│   │   ├── types/                         # TypeScript interfaces
│   │   │   ├── pacients.ts                # Patient-related types
│   │   │   ├── turnos.ts                  # Appointment types
│   │   │   ├── finanzas.ts                # Financial types
│   │   │   └── ... (10+ type files)
│   │   └── schemas/                       # Zod validation schemas
│   │       ├── paciente.schema.ts         # Patient form validation
│   │       ├── turno.schema.ts            # Appointment validation
│   │       └── ... (5+ schema files)
│   ├── public/                            # Static assets
│   ├── .next/                             # Next.js build output (gitignored)
│   ├── package.json                       # Frontend dependencies
│   ├── next.config.js                     # Next.js configuration
│   └── tsconfig.json                      # TypeScript config
│
├── .planning/                             # GSD planning documents
│   ├── codebase/                          # Architecture analysis
│   │   ├── ARCHITECTURE.md                # Layers, patterns, data flow
│   │   └── STRUCTURE.md                   # (this file)
│   └── phases/                            # Planned work phases
│
├── .git/                                  # Git repository
├── .github/                               # GitHub configuration
├── CLAUDE.md                              # Claude Code project guide
└── README.md                              # Project documentation
```

## Directory Purposes

**backend/src/modules/:**
- Purpose: Feature-based modules following NestJS architecture
- Contains: Each module has controller.ts, service.ts, module.ts, and dto/ subdirectory
- Key files:
  - `pacientes/` - Patient CRUD, CRM stage management, follow-up scheduler
  - `turnos/` - Appointment CRUD, scheduling, live session management (cirugía)
  - `finanzas/` - Financial reports, dashboards, balance calculations
  - `reportes/` - Aggregated data for operational/financial reports, CRM metrics
  - `historia-clinica/` - Clinical entries, templates
  - `auth/` - Login, token refresh, session management
  - `usuarios/` - User CRUD, email/password reset
  - `obras-sociales/` - Insurance provider management, plan catalogs
  - `presupuestos/` - Quote creation, status tracking, rejection handling

**backend/src/common/:**
- Purpose: Shared infrastructure across all modules
- `middleware/` - AuditMiddleware logs all requests
- `pipes/` - SanitizeEmptyValuesPipe removes null/undefined from request bodies
- `scope/` - resolve-scope.ts enforces professional context filtering
- `decorators/` - @Auth() for role-based access control
- `types/` - TypeScript interfaces (PacienteSuggest, etc.)
- `constants/` - ESTADO_PRIORITY, estado transitions, enums

**backend/src/prisma/:**
- Purpose: Database layer and ORM configuration
- `schema.prisma` - Single source of truth for all models and their relationships
  - Core models: Usuario, Paciente, Profesional, Turno, HistoriaClinica, Presupuesto, TareaSeguimiento
  - CRM models: EtapaCRM enum, TemperaturaPaciente, MotivoPerdidaCRM
  - Financial models: LiquidacionObraSocial, CuentaCorriente, Factura
- `migrations/` - Timestamped SQL migrations in standard Prisma format
- `prisma.service.ts` - Global, injectable PrismaClient wrapper with connection pooling

**frontend/src/app/:**
- Purpose: Next.js App Router page structure (file-based routing)
- `dashboard/` - Protected area with sub-routes for each feature
  - Each sub-route has `page.tsx` (main view) and `components/` folder (local components)
  - `layout.tsx` - Auth guard, navigation shell, global providers
- `login/` - Public authentication page
- `providers.tsx` - React Query setup with 30s staleTime, retry logic
- `layout.tsx` - Root HTML structure, fonts, global CSS, Toaster

**frontend/src/components/:**
- Purpose: Reusable React components shared across pages
- `ui/` - shadcn/ui primitives (buttons, dialogs, tables, forms)
- `data-table/` - Reusable data table with sorting, filtering, pagination
- `crm/` - CRM-specific: KanbanBoard, PatientCard, TemperatureSelector
- `live-turno/` - Real-time consultation: timer, session panel, recovery dialog
- Custom components: AutocompletePaciente, DiagnosticoCombobox, PhotoUploader

**frontend/src/hooks/:**
- Purpose: React Query hooks for data fetching and state management
- Pattern: One query hook per entity type (`usePacientes`), mutation hooks for actions (`useCreatePaciente`)
- All hooks use `api` client from `lib/api.ts` with automatic JWT attachment
- All hooks integrate with `useEffectiveProfessionalId()` to apply professional context filtering

**frontend/src/lib/:**
- Purpose: Utility functions and API client
- `api.ts` - Axios instance with:
  - Request interceptor: adds Authorization Bearer token from localStorage
  - Response interceptor: handles 401 errors by refreshing token via /auth/refresh
  - Queue mechanism: deduplicates token refresh requests, replays queued requests
- `permissions.ts` - hasRouteAccess(pathname, rol) checks if user can access route
- `utils.ts` - Formatting (date, currency), string utilities

**frontend/src/store/:**
- Purpose: Global Zustand state (persisted to localStorage)
- `professional-context.store.ts` - selectedProfessionalId (used by admin/secretaria to filter data)
- `live-turno.store.ts` - Active consultation session, timer state, minimized flag
- `mensajes-internos.store.ts` - Message UI state (selected conversation, unread counts)
- `template-wizard.store.ts` - Clinical template form step state

## Key File Locations

**Entry Points:**

| File | Purpose |
|------|---------|
| `backend/src/main.ts` | NestJS bootstrap, CORS setup, global error filter registration |
| `frontend/src/app/layout.tsx` | Root React layout, font setup, providers wrapper |
| `frontend/src/app/dashboard/layout.tsx` | Dashboard shell, auth guard, navigation |
| `frontend/src/app/login/page.tsx` | Public login form |

**Configuration:**

| File | Purpose |
|------|---------|
| `backend/src/app.module.ts` | Imports all feature modules, configures middleware |
| `backend/src/prisma/schema.prisma` | Database schema, models, enums, migrations |
| `backend/.env` | (Git-ignored) DATABASE_URL, JWT_SECRET |
| `frontend/.env.local` | (Git-ignored) NEXT_PUBLIC_API_URL |
| `frontend/next.config.js` | Build and runtime configuration |

**Core Logic:**

| File | Purpose |
|------|---------|
| `backend/src/modules/pacientes/pacientes.service.ts` | Patient CRUD, CRM stage transitions |
| `backend/src/modules/turnos/turnos.service.ts` | Appointment scheduling, state transitions |
| `backend/src/modules/finanzas/finanzas.service.ts` | Financial calculations, dashboards |
| `backend/src/modules/reportes/reportes.service.ts` | Report aggregation, CRM metrics |
| `backend/src/modules/auth/auth.service.ts` | Login, token generation, refresh logic |
| `frontend/src/lib/api.ts` | API client, token refresh interceptor |

**Testing:**

| Location | Purpose |
|----------|---------|
| `backend/test/` | E2E tests (app.e2e-spec.ts) |
| `frontend/` | No test files yet (opportunity) |

## Naming Conventions

**Files:**

- **Controllers:** `*.controller.ts` (e.g., `pacientes.controller.ts`)
- **Services:** `*.service.ts` (e.g., `pacientes.service.ts`)
- **Modules:** `*.module.ts` (e.g., `pacientes.module.ts`)
- **DTOs:** `*.dto.ts` in `dto/` subfolder (e.g., `create-paciente.dto.ts`)
- **Hooks:** `use*.ts` prefix (e.g., `usePacientes.ts`, `useCreatePaciente.ts`)
- **Components:** PascalCase (e.g., `PatientCard.tsx`, `CRMFunnelWidget.tsx`)
- **Stores:** `*-store.ts` suffix (e.g., `professional-context.store.ts`)
- **Schemas:** `*.schema.ts` in `schemas/` (e.g., `paciente.schema.ts`)

**Directories:**

- **Feature modules:** kebab-case (e.g., `pacientes/`, `tipos-turno/`)
- **Subdirectories:** kebab-case (`dto/`, `data-table/`, `live-turno/`)
- **App routes:** kebab-case matching URL path (e.g., `dashboard/pacientes/[id]/`)

**TypeScript:**

- **Types/Interfaces:** PascalCase (e.g., `PacienteListItem`, `CreateTurnoDto`)
- **Enums:** PascalCase (e.g., `RolUsuario`, `EstadoTurno`, `EtapaCRM`)
- **Variables/Functions:** camelCase (e.g., `selectedProfessionalId`, `resolveScope()`)

## Where to Add New Code

**New Feature (e.g., Inventario Module):**

1. **Backend:**
   - Create `backend/src/modules/inventario/`
   - Add `inventario.module.ts` (imports ScheduleModule if needed)
   - Add `inventario.controller.ts` with @Auth decorator
   - Add `inventario.service.ts` with business logic using PrismaService
   - Create `dto/` folder with `create-inventario.dto.ts`, etc.
   - Add models to `backend/src/prisma/schema.prisma`
   - Import InventarioModule in `backend/src/app.module.ts`

2. **Frontend:**
   - Create `frontend/src/app/dashboard/inventario/` with `page.tsx` and `components/`
   - Create `frontend/src/hooks/useInventario.ts`, `useCreateInventario.ts`, etc.
   - Add `InventarioCombobox.tsx` in `frontend/src/components/` if needed
   - Add types in `frontend/src/types/inventario.ts`
   - Add Zod schema in `frontend/src/schemas/inventario.schema.ts`

**New Component:**
- Pure UI: Place in `frontend/src/components/ui/` (shadcn-like)
- Feature-specific: Place in `frontend/src/components/` with descriptive PascalCase name
- Page-specific: Place in `frontend/src/app/dashboard/[feature]/components/`

**New Utility:**
- Shared across frontend: `frontend/src/lib/utils.ts` or new file in `lib/`
- Shared across backend: `backend/src/common/utils/` new file
- Single module only: Within module's service or subdirectory

**New Hook:**
- Data fetching: `frontend/src/hooks/use[EntityName].ts` (query) or `use[Action].ts` (mutation)
- Custom logic: `frontend/src/hooks/use[Feature].ts`
- Always use `useEffectiveProfessionalId()` for filters that respect professional context

## Special Directories

**Generated:**
- `.next/` - Next.js build output (gitignored)
- `node_modules/` - npm dependencies (gitignored)
- `backend/src/prisma/migrations/` - Prisma migrations (committed, auto-generated by prisma migrate)

**Configuration:**
- `.planning/codebase/` - Architecture documentation (committed)
- `.github/` - GitHub Actions workflows (if any)
- `.vscode/` - VS Code settings (committed)
- `.cursor/` - Cursor AI settings (local)

**Not Committed:**
- `.env`, `.env.local` - Secrets and credentials (pattern: .env*)
- `*.tsbuildinfo` - TypeScript incremental build cache (gitignored)
- `.DS_Store` - macOS folder metadata (gitignored)

---

*Structure analysis: 2026-02-21*
