# Architecture

**Analysis Date:** 2026-02-21

## Pattern Overview

**Overall:** Multi-tier monorepo with clear separation between backend (NestJS) and frontend (Next.js). Implements role-based access control (RBAC) with JWT authentication. Follows NestJS modular architecture for backend and Next.js App Router for frontend.

**Key Characteristics:**
- Full-stack TypeScript with shared type safety via Prisma
- Feature-based module organization (pacientes, turnos, finanzas, reportes, etc.)
- Database-driven with PostgreSQL + Prisma ORM
- JWT-based stateless authentication with refresh tokens
- Professional context filtering for multi-professional clinic access
- Real-time capabilities (LiveTurno) and scheduled tasks (CRM follow-up scheduler)

## Layers

**Presentation/UI Layer:**
- Purpose: React-based user interface with responsive design
- Location: `frontend/src/app/` (Next.js App Router pages), `frontend/src/components/`
- Contains: Page components, UI forms, dialogs, data tables, real-time panels
- Depends on: TanStack Query hooks, API client, Zustand stores, shadcn/ui components
- Used by: Users directly via browser

**API/Controller Layer:**
- Purpose: HTTP endpoints for client requests
- Location: `backend/src/modules/*/` (each module has `*.controller.ts`)
- Contains: Decorators (@Controller, @Get, @Post, @Patch), DTOs for request/response validation
- Depends on: Service layer for business logic, Auth decorators for access control
- Used by: Frontend API calls via axios (`frontend/src/lib/api.ts`)
- Example: `backend/src/modules/pacientes/pacientes.controller.ts` - handles CRUD for patients

**Service/Business Logic Layer:**
- Purpose: Core business logic, data transformations, orchestration
- Location: `backend/src/modules/*/` (each module has `*.service.ts`)
- Contains: Database queries, business rules, scheduled tasks, external service calls
- Depends on: PrismaService (global), other services in same module
- Used by: Controllers, scheduled tasks, other services
- Example: `backend/src/modules/pacientes/pacientes.service.ts` - patient lifecycle, CRM stages

**Data Access/Persistence Layer:**
- Purpose: Database abstraction and query execution
- Location: `backend/src/prisma/` - PrismaService provides ORM access
- Contains: Prisma schema models, migrations, database operations
- Depends on: PostgreSQL database
- Used by: Service layer for all database operations
- Schema file: `backend/src/prisma/schema.prisma` - defines Usuario, Paciente, Turno, HistoriaClinica, etc.

**State Management Layer (Frontend):**
- Purpose: Client-side state persistence and global context
- Location: `frontend/src/store/` (Zustand stores), `frontend/src/hooks/` (React Query hooks)
- Contains: UI state (sidebar, focus mode), professional context selection, live turno sessions
- Depends on: localStorage for persistence, React Query for server state
- Used by: Page and component layers for data fetching and state
- Key stores: `professional-context.store.ts` (selected professional), `live-turno.store.ts` (active sessions)

**Authentication/Authorization Layer:**
- Purpose: User identity verification and permission enforcement
- Location: `backend/src/modules/auth/` (guards, strategies, decorators)
- Contains: JWT validation, role-based guards, session management
- Depends on: JWT secret from environment, Prisma for user/session data
- Used by: Controllers via @Auth decorator, API client via token interceptor
- Key files:
  - Backend: `jwt-roles.guard.ts`, `auth.decorator.ts`, `jwt.strategy.ts`
  - Frontend: `api.ts` interceptor for token attachment and refresh logic

**Data Fetching/API Client Layer (Frontend):**
- Purpose: Centralized HTTP client with automatic authentication
- Location: `frontend/src/lib/api.ts` (axios instance), `frontend/src/hooks/` (query hooks)
- Contains: Request/response interceptors, token refresh logic, query hooks with TanStack Query
- Depends on: localStorage for tokens, backend API endpoints
- Used by: All page and component layers for data operations
- Pattern: One hook per entity type (usePacientes, usePaciente, useCreatePaciente, etc.)

## Data Flow

**Patient Creation Flow:**

1. Frontend: `PatientFormModal` component collects form input via React Hook Form
2. Frontend: `useCreatePaciente` hook calls `api.post('/pacientes', dto)`
3. API Client: `frontend/src/lib/api.ts` interceptor adds Authorization header with JWT token
4. Backend: `POST /pacientes` hits `pacientes.controller.ts` create() method
5. Controller: Validates DTO schema using SanitizeEmptyValuesPipe
6. Controller: Calls `pacientes.service.create(dto)` after auth check via @Auth decorator
7. Service: Transforms dates (fechaNacimiento, fechaIndicaciones), handles duplicate DNI check
8. Service: Calls `prisma.paciente.create()` with data
9. Database: Inserts patient record, returns created patient with id
10. Service: Returns patient entity to controller
11. Controller: Returns HTTP 201 with patient data to frontend
12. Frontend: React Query invalidates 'pacientes' query cache, triggers refetch
13. UI: Patient appears in list, user receives confirmation toast

**Appointment Scheduling Flow:**

1. Frontend: Calendar page shows available slots for selected professional/date
2. Frontend: `useTurnosRangos` hook fetches available time slots
3. User selects slot and confirms in `NewAppointmentModal`
4. Frontend: `CreateTurnoDto` sent via `api.post('/turnos')`
5. Backend: `turnos.controller.ts` validates professional access via `resolveScope`
6. Service: Creates turno with ESTADO_TURNO.PROGRAMADO, links to patient
7. Service: Triggers CRM logic (if no etapaCRM, sets to appropriate stage)
8. Database: Returns created appointment
9. Frontend: Calendar re-renders with new appointment, query cache refreshed
10. If appointment is for current professional (LiveTurno): session state updated

**CRM Follow-up Scheduler Flow:**

1. Backend: `SeguimientoSchedulerService` runs daily at 9 AM (EVERY_DAY_AT_9AM)
2. Service: Queries all pacientes with specific etapaCRM stages
3. Service: Creates TareaSeguimiento records for patients needing follow-up
4. Service: Updates patient `ultimoSeguimiento` timestamp
5. Database: Inserts follow-up task records
6. Frontend: CRMKanban or pacientes page reflects updated seguimiento counts on next refresh

**Professional Context Filtering:**

1. User (Admin/Secretaria) selects professional from dropdown in Sidebar
2. `useProfessionalContext` Zustand store updates `selectedProfessionalId` (persisted to localStorage)
3. All data-fetching hooks use `useEffectiveProfessionalId()` to resolve current professional context
4. `useEffectiveProfessionalId` returns:
   - If logged user is PROFESIONAL: their fixed profesionalId
   - If logged user is ADMIN/SECRETARIA: selectedProfessionalId from store (or null for all)
5. Hooks pass `profesionalId` as query param to API
6. Backend `resolveScope()` enforces that PROFESIONAL users can only see their own data
7. Data filters in service layer by profesionalId when provided

**State Management:**

**Server State (React Query):**
- Managed in hooks like `usePacientes()`, `useAgenda()`, `useFinanzas()`
- Cached with queryKey including professional context (e.g., `["pacientes", effectiveProfessionalId]`)
- Automatically refetched on window focus or manual invalidation
- Stale time: 30 seconds by default

**Client State (Zustand):**
- UI state: `useUIStore` - sidebar collapsed, focus mode enabled
- Professional context: `useProfessionalContext` - selected professional for filtering
- Live turno: `useLiveTurnoStore` - active consultation session, timer, minimized state
- All stores persist to localStorage with Zustand middleware

**Auth State:**
- Tokens stored in localStorage: `accessToken` (15m), `refreshToken`, `sessionId`
- On 401 response: API client automatically refreshes token via `/auth/refresh`
- Failed refresh clears tokens and redirects to `/login`

## Key Abstractions

**Module Pattern:**
- Purpose: Feature-based organization following NestJS conventions
- Examples: `backend/src/modules/pacientes/`, `backend/src/modules/turnos/`, `backend/src/modules/finanzas/`
- Pattern: Each module contains controller.ts, service.ts, module.ts, dto/ folder
- Structure enables: Lazy-loading, clear dependency boundaries, testability

**Entity DTOs (Data Transfer Objects):**
- Purpose: Decouple API contract from internal models, validate input
- Locations: `backend/src/modules/*/dto/`
- Examples: `CreatePacienteDto`, `UpdatePacienteDto`, `CreateTurnoDto`
- Used in: Controller methods for request validation, response shape specification

**Prisma Models & Enums:**
- Purpose: Single source of truth for data structure and types
- Location: `backend/src/prisma/schema.prisma`
- Key models: `Usuario` (base user), `Paciente`, `Profesional`, `Turno`, `HistoriaClinica`, `Presupuesto`, `TareaSeguimiento`
- Key enums: `RolUsuario` (ADMIN, PROFESIONAL, SECRETARIA, PACIENTE, FACTURADOR), `EstadoPaciente`, `EtapaCRM`, `TemperaturaPaciente`

**React Query Hooks:**
- Purpose: Standardized data fetching with caching, error handling, loading states
- Location: `frontend/src/hooks/use*.ts`
- Pattern: `useQuery` for fetches, `useMutation` for mutations, queryKey includes context vars
- Benefits: Automatic refetch, cache invalidation, deduplicated requests

**Zustand Stores:**
- Purpose: Global client state with persistence
- Location: `frontend/src/store/*.ts`
- Pattern: `create()` with middleware, selective state updates
- Persistence: localStorage via persist middleware

**Custom Decorators (Auth):**
- Purpose: Declarative access control on controllers
- Location: `backend/src/modules/auth/decorators/auth.decorator.ts`
- Usage: `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')` on controller methods
- Implementation: Combines @Roles and @UseGuards(JwtRolesGuard)

## Entry Points

**Backend Bootstrap:**
- Location: `backend/src/main.ts`
- Triggers: `npm run start:dev` or `npm run start:prod`
- Responsibilities:
  - Creates NestJS app from AppModule
  - Configures CORS for frontend origins (localhost:3000, production Vercel URL)
  - Registers PrismaClientExceptionFilter globally for database error handling
  - Starts server on port 3001 with address 0.0.0.0

**Frontend Bootstrap:**
- Location: `frontend/src/app/layout.tsx` (root), `frontend/src/app/providers.tsx`
- Triggers: `npm run dev` for development, `npm run build` then run for production
- Responsibilities:
  - Sets up global providers (QueryClientProvider for React Query, axios defaults)
  - Configures fonts (Geist Sans/Mono), styling (Tailwind, globals.css)
  - Renders BackgroundBeams and Toaster components
  - Wraps children with Providers component

**Protected Routes:**
- Location: `frontend/src/app/dashboard/layout.tsx`
- Triggers: Any access to `/dashboard/*` routes
- Responsibilities:
  - Verifies accessToken in localStorage, redirects to `/login` if missing
  - Validates current user via `useCurrentUser()` query
  - Checks route permissions via `hasRouteAccess(pathname, user.rol)`
  - Renders navigation (Sidebar, Topbar, DockNav)
  - Provides MensajesProvider context
  - Renders LiveTurno global components (panel, indicator, recovery dialog, sync checker)

**Authentication Entry Point:**
- Location: `backend/src/modules/auth/auth.service.ts` and `auth.controller.ts`
- Endpoints:
  - `POST /auth/login` - validates email/password, returns accessToken + refreshToken
  - `POST /auth/refresh` - takes refreshToken, returns new accessToken
  - `POST /auth/logout` - invalidates session
- Usage: Frontend calls login before any other API request

## Error Handling

**Strategy:** Multi-layer error handling with centralized Prisma exception filter and API client interceptor

**Backend Patterns:**

1. **Validation Errors:** DTOs with class-validator decorators catch on controller entry
   - Example: `@IsEmail()`, `@IsNotEmpty()` on DTO fields
   - Returns: 400 Bad Request with validation errors

2. **Business Logic Exceptions:** Services throw NestJS exceptions
   ```typescript
   throw new ConflictException('El DNI ingresado ya está registrado.');
   throw new NotFoundException('Paciente no encontrado');
   throw new ForbiddenException('Acceso denegado');
   ```
   - Caught by NestJS global exception filter
   - Returned: Appropriate HTTP status (409, 404, 403)

3. **Database Errors:** Prisma errors caught by `PrismaClientExceptionFilter`
   - Location: `backend/src/prisma-client-exception/prisma-client-exception.filter.ts`
   - Handles P2002 (unique constraint) → 409 Conflict
   - Other errors → 500 Internal Server Error with message

4. **Audit Middleware:** `AuditMiddleware` logs all requests
   - Location: `backend/src/common/middleware/audit.middleware.ts`
   - Logs: method, path, userId, IP, timestamp

**Frontend Patterns:**

1. **API Request Errors:** Caught in React Query hooks
   - useQuery/useMutation automatically retry failed requests (default: 1 retry)
   - Errors propagated to component via `error` state

2. **Token Refresh:** Handled in `frontend/src/lib/api.ts` interceptor
   - On 401: Attempts refresh via `/auth/refresh` with refreshToken
   - If refresh fails: Clears tokens, redirects to `/login`
   - Queues duplicate 401 requests during refresh to avoid race conditions

3. **User Feedback:** Toast notifications via Sonner library
   - Success: `toast.success('Paciente creado')`
   - Error: `toast.error('Error al crear paciente')`
   - Auto-dismiss with action button for undo/retry

## Cross-Cutting Concerns

**Logging:**
- Backend: `console.log()` in audit middleware and service methods (on-demand, can be improved with winston/pino)
- Frontend: Browser console via React Query devtools, Sonner toast messages

**Validation:**
- Backend: Class-validator decorators on DTOs
- Frontend: Zod schemas in `frontend/src/schemas/`, React Hook Form integration
- Example: Patient creation validates email format, DNI uniqueness

**Authentication:**
- Strategy: JWT (JSON Web Tokens) with Passport.js
- Flow: Login returns accessToken (15min) + refreshToken (30d stored in DB)
- Token placement: Authorization header as Bearer token
- Scope enforcement: `resolveScope()` ensures PROFESIONAL users see only their data

**Authorization:**
- Role-based access control (RBAC) via RolUsuario enum
- Roles: ADMIN (full access), PROFESIONAL (see own data), SECRETARIA (clinic data), PACIENTE (own profile), FACTURADOR (billing data)
- Enforced: @Auth decorator on controllers, hasRouteAccess() on frontend routes
- Professional context: Filters data by selected professional (admin/secretaria) or fixed professional (profesional user)

**Performance:**
- Frontend: React Query caching with 30s staleTime, deduplicated requests
- Backend: Database indexes on frecuente queries (email, DNI, profesionalId), Prisma's query optimization
- Pagination: Not yet fully implemented in list endpoints (opportunities for optimization)

**Multi-tenancy/Professional Isolation:**
- No global tenant ID (single clinic instance)
- Professional context filters data at query level
- Controllers use `resolveScope()` to determine effective professional ID
- Services apply profesionalId filters in Prisma queries

---

*Architecture analysis: 2026-02-21*
