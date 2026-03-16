# Codebase Concerns

**Analysis Date:** 2026-02-21

## Tech Debt

### Large, Complex Service Files
**Area:** Backend business logic

**Files with high complexity:**
- `backend/src/modules/reportes/services/reportes-financieros.service.ts` (738 lines)
- `backend/src/modules/turnos/turnos.service.ts` (725 lines)
- `backend/src/modules/finanzas/finanzas.service.ts` (684 lines)
- `backend/src/modules/pacientes/pacientes.service.ts` (664 lines)
- `backend/src/modules/cuentas-corrientes-proveedores/cuentas-corrientes-proveedores.service.ts` (611 lines)

**Issue:** Single Responsibility Principle violations. Services handle too many concerns (queries, transformations, state management). Makes unit testing difficult and increases bug risk.

**Fix approach:** Break services into smaller, focused classes. Extract query logic, data transformation, and business logic into separate classes. Example: `reportes-financieros.service.ts` could split into `reportes-query.service.ts` and `reportes-calculator.service.ts`.

**Priority:** Medium

### Oversized Frontend Components
**Area:** Frontend UI components

**Files with high complexity:**
- `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` (1054 lines)
- `frontend/src/components/hc-templates/builder/NodePropertiesEditor.tsx` (945 lines)
- `frontend/src/app/dashboard/turnos/page.tsx` (760 lines)
- `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` (723 lines)

**Issue:** Monster components with multiple concerns (form state, validation, data fetching, rendering). State management scattered across useState calls. Hard to test and maintain.

**Fix approach:** Extract form logic into custom hooks (`usePatientForm`, `useClinicalHistoryForm`). Split rendering into subcomponents. Move validation to Zod schemas.

**Priority:** Medium

### Unfinished Features with TODO Comments
**Area:** Backend API and frontend hooks

**Files:**
- `backend/src/modules/reportes/services/reportes-export.service.ts:53` - CSV export not implemented
- `backend/src/modules/reportes/services/reportes-export.service.ts:82` - Email scheduling (Phase 5)
- `frontend/src/app/dashboard/stock/page.tsx:317` - Backend data retrieval incomplete
- `frontend/src/hooks/useFinanzas.ts:292` - SendPresupuesto endpoint not ready
- `frontend/src/hooks/useFinanzas.ts:356` - PDF generation endpoint not ready
- `frontend/src/hooks/useFinanzas.ts:445` - Export functionality stub

**Issue:** Core features blocked on backend implementation. Frontend has placeholder logic. Prevents users from using these features.

**Fix approach:**
1. Prioritize backend endpoints for sendPresupuesto, PDF generation, and exports
2. Document dependencies in tickets
3. Remove TODOs and implement or disable features clearly

**Priority:** High

---

## Type Safety Issues

### Disabled TypeScript Strict Mode (Backend)
**File:** `backend/tsconfig.json`

**Configuration:**
```json
{
  "strictNullChecks": false,
  "noImplicitAny": false,
  "strictBindCallApply": false,
  "forceConsistentCasingInFileNames": false
}
```

**Issue:** All strict mode options disabled. Allows:
- `any` types without warning
- Null/undefined access without checks
- Inconsistent casing

This masks real bugs. Code like `(p as any).obraSocial?.nombre` (seen in `pacientes.service.ts:130`) indicates type safety problems.

**Fix approach:** Enable strict mode incrementally:
1. Start with `strictNullChecks: true`
2. Add `noImplicitAny: true`
3. Fix compile errors
4. Enable remaining flags

**Priority:** High (enables future refactoring safety)

### Inconsistent Type Casting
**Area:** Backend services

**Example:** `backend/src/modules/pacientes/pacientes.service.ts:130`
```typescript
obraSocialNombre: (p as any).obraSocial?.nombre ?? null,
```

**Issue:** `as any` bypasses Prisma's type inference. Suggests schema or query mismatch.

**Fix approach:** Ensure Prisma relations are properly typed in queries. Remove all `as any` casts by fixing underlying types.

**Priority:** Medium

---

## Test Coverage Gaps

**Current state:** Only 9 `.spec.ts` files for 163 backend source files (~5.5% coverage)

**Tested modules:**
- `diagnosticos.service.spec.ts` / `.controller.spec.ts`
- `reportes.controller.spec.ts` / Services with tests

**Untested modules:**
- `pacientes` - No tests despite critical patient data handling
- `turnos` - No tests despite complex scheduling logic
- `finanzas` - No tests despite money handling
- `stock` - No tests for inventory
- `cuentas-corrientes` - No tests for financial state

**Issue:** Changes to patient, appointment, or financial logic have no safety net. Bugs surface in production.

**Fix approach:**
1. Add unit tests for critical paths: patient CRUD, appointment state transitions, payment processing
2. Minimum 30% coverage for business logic
3. Focus on edge cases: duplicate DNI, concurrent bookings, payment conflicts

**Priority:** High

---

## Known Issues & Bugs

### Console Logs in Production Code
**Area:** Backend services

**Files with console output:**
- `backend/src/modules/pacientes/pacientes.service.ts:33,48` - `console.log('DTO RECIBIDO:', dto)`, `console.log('ERROR CAPTURADO IN CATCH:', error)`
- `backend/src/prisma/seed-users.ts:9` - Seeding logs
- Multiple other services with `console.*` calls

**Issue:** Debug output leaks to logs. Makes production debugging harder. PII may be logged.

**Fix approach:**
1. Replace all console.* with NestJS Logger
2. Use appropriate log levels: info, warn, error
3. Never log full request/error objects containing sensitive data

**Priority:** Medium

### Error Handling Inconsistency
**Area:** Exception handling across services

**Pattern observed:**
- Some services throw custom exceptions
- Others throw generic InternalServerErrorException
- Some catch and re-throw, others propagate

Example from `pacientes.service.ts:51-55`:
```typescript
if (error.code === 'P2002' && error.meta?.target?.includes('dni')) {
  throw new ConflictException('El DNI ingresado ya está registrado.');
}
throw new InternalServerErrorException('Error interno al crear paciente');
```

**Issue:** Inconsistent error responses. Client doesn't know error type. Makes debugging harder.

**Fix approach:**
1. Create custom exception classes for business errors (DuplicateDniException, etc.)
2. Document which exceptions each endpoint throws
3. Standardize error response format

**Priority:** Medium

### Missing Input Validation
**Area:** DTOs and request handling

**Observation:** DTOs use `class-validator` decorators (seen in turnos DTOs) but coverage is incomplete. Some numeric fields lack range validation.

**Fix approach:**
1. Audit all DTOs for missing `@Min`, `@Max` constraints
2. Add custom validators for business logic (e.g., appointment can't be in past)

**Priority:** Low

---

## Security Considerations

### LocalStorage Token Storage
**File:** `frontend/src/lib/api.ts`

**Pattern:**
```typescript
const token = localStorage.getItem("accessToken");
localStorage.setItem("accessToken", accessToken);
localStorage.removeItem("accessToken");
```

**Risk:**
- XSS vulnerability could steal tokens from localStorage
- Tokens persist until manual logout (no expiry in storage)
- Refresh token visible to JavaScript

**Current mitigation:**
- API interceptor auto-refreshes tokens
- Logout clears storage
- withCredentials for CORS

**Recommendations:**
1. Consider moving refresh token to httpOnly cookie (requires backend change)
2. Add token expiry check in `api.ts` before refresh
3. Implement CSRF protection for state-changing operations
4. Add Content Security Policy headers

**Priority:** High

### JWT Token Handling
**Area:** Backend authentication

**Concern:** Refresh token strategy in `api.ts` queues failed requests while refreshing. Race condition if multiple requests fail simultaneously.

**Current code (lines 65-76):**
```typescript
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  })
    .then((token) => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    })
```

**Risk:** If token refresh fails, queued requests resolve with undefined token, causing silent failures.

**Fix approach:**
1. Add timeout to refresh attempt (currently unbounded)
2. Validate token before queuing
3. Log queue state for debugging

**Priority:** Medium

### Missing RBAC Audit Trail
**Area:** Multi-tenant authorization

**Observation:** Code restricts endpoints with `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', ...)` but:
- No audit logs of who accessed what
- No admin logs of permission changes
- No detection of privilege escalation attempts

**Fix approach:**
1. Add AuditMiddleware to log all user actions (see `backend/src/common/middleware/audit.middleware.ts` - exists but needs verification it's active)
2. Log permission checks on sensitive endpoints
3. Alert on failed auth attempts

**Priority:** Medium

---

## Performance Bottlenecks

### N+1 Query Patterns
**Area:** Pacientes service

**File:** `backend/src/modules/pacientes/pacientes.service.ts:59-100`

**Pattern:** `obtenerListaPacientes()` fetches multiple related records:
```typescript
include: {
  usuario: { select: { fotoUrl: true } },
  cuentaCorriente: { select: { saldoActual: true } },
  obraSocial: { select: { nombre: true } },
  estudios: { select: { estado: true } },
  turnos: { select: { inicio: true }, orderBy: { inicio: 'desc' } },
  presupuestos: { select: { estado: true } },
  objecion: true,
}
```

**Issue:** Deep nesting with sub-queries. If this endpoint returns 100 pacientes, Prisma executes multiple queries per patient for joins and nested selects.

**Fix approach:**
1. Profile actual query count with `{ logWhere: true }` in Prisma
2. Consider query batching or dataloader pattern
3. Cache frequently accessed relationships

**Priority:** Medium (visible at scale, 50+ patients)

### Missing Database Indexes
**File:** `backend/src/prisma/schema.prisma`

**Observation:**
- Paciente.dni is unique (good for lookups)
- Many findMany queries lack orderBy coverage
- ReporteSuscripcion has `@@index([proximoEnvio, activo])` (good pattern)

**Concern:** Other high-cardinality queries may be slow.

**Fix approach:**
1. Add indexes for common filter combinations
2. Index date fields used in reports (fechaDesde, fechaHasta)
3. Monitor slow query logs

**Priority:** Low (address if users report slowness)

### Unoptimized Frontend Data Fetching
**Area:** TanStack Query hooks

**Pattern:** Hooks fetch full patient lists but only display paginated subsets.

Example: `usePacientes()` fetches all patients, then frontend paginates.

**Fix approach:**
1. Implement server-side pagination in backend endpoints
2. Pass pageSize, pageNumber to API
3. Cache pagination state in Zustand

**Priority:** Medium (impacts performance with 500+ patients)

### Large Report Generation
**File:** `backend/src/modules/reportes/services/reportes-financieros.service.ts`

**Issue:** `getReporteIngresos()` aggregates large datasets in memory without limits.

**Fix approach:**
1. Add date range limits to prevent runaway queries
2. Implement streaming response for large exports
3. Cache frequent reports

**Priority:** Medium

---

## Fragile Areas

### Appointment Scheduling Logic
**Files:**
- `backend/src/modules/turnos/turnos.service.ts` (725 lines)
- `frontend/src/app/dashboard/turnos/CalendarGrid.tsx` (709 lines)

**Why fragile:**
- Complex state transitions (scheduled → confirmed → started → completed)
- Concurrent modification risk (two users booking same slot)
- No distributed lock on availability
- Mobile network issues can interrupt session management

**Safe modification:**
1. Add unit tests for state transition matrix
2. Use optimistic locking (check version before update)
3. Add idempotency keys to booking requests
4. Implement booking timeout with auto-release

**Test coverage:** Minimal - no turnos.service.spec.ts

**Priority:** High

### Financial State Management
**Files:**
- `backend/src/modules/finanzas/finanzas.service.ts` (684 lines)
- `backend/src/modules/cuentas-corrientes/cuentas-corrientes.service.ts` (312 lines)

**Why fragile:**
- Multiple services handle money (CuentasCorrientes, Presupuestos, MovimientoCC)
- Transactions exist but inconsistently used
- No balance validation on writes
- Partial payment logic complex

**Safe modification:**
1. Use transactions for all money operations
2. Add balance checksums to detect drift
3. Implement payment status machine with limited transitions
4. Test negative balance scenarios

**Test coverage:** None - no finanzas.service.spec.ts

**Priority:** High

### Patient Data Consistency
**File:** `backend/src/modules/pacientes/pacientes.service.ts` (664 lines)

**Why fragile:**
- Multiple update endpoints (pacientes, historia-clinica, seguimiento)
- No optimistic locking
- Type casting with `as any` masks real issues

**Safe modification:**
1. Enable strict type checking first
2. Add version field to Paciente for optimistic locking
3. Batch related updates in transactions

**Test coverage:** None - no pacientes.service.spec.ts

**Priority:** High

### Report Generation Pipeline
**Area:** Reportes modules

**Services:**
- `reportes-financieros.service.ts` (738 lines)
- `reportes-operativos.service.ts` (560 lines)
- `reportes-dashboard.service.ts` (400 lines)

**Why fragile:**
- Complex aggregation logic with many edge cases
- Handles both real-time and scheduled reports
- Export to PDF/CSV incomplete (TODOs)
- Date range calculations manual

**Safe modification:**
1. Add unit tests for aggregation logic
2. Test edge cases: no data, month boundary, leap years
3. Implement report versioning for audit trail

**Test coverage:** Some reportes.spec.ts exists but incomplete

**Priority:** Medium

---

## Scaling Limits

### Authentication Session Storage
**Current:** In-memory session tracking with optional persistent store

**Concern:** No documented session TTL or cleanup. Old sessions may accumulate.

**Scaling limit:**
- Hundreds of users = manageable
- Thousands = memory/database bloat
- Sessions never auto-expire (manual logout only)

**Scaling path:**
1. Implement automatic session TTL (30 days default)
2. Implement session cleanup cron job
3. Use Redis for distributed sessions

**Priority:** Medium (implement before 1000+ users)

### Report Caching
**Observation:** Reports fetch live data on every request.

**Scaling limit:**
- <50 users: Fine
- 100+ users: Report queries slow
- Concurrent report requests: Database load spike

**Scaling path:**
1. Cache daily/weekly report summaries (1-hour TTL)
2. Generate reports asynchronously
3. Queue large exports

**Priority:** Medium

### File Upload Handling
**Concern:** Stock invoice uploads (`CargaFacturaModal.tsx`) not rate-limited.

**Scaling limit:** No maximum file size defined. Malicious uploads could DoS.

**Scaling path:**
1. Add file size limits (max 50MB)
2. Virus scan uploaded files
3. Store in S3, not local filesystem
4. Implement rate limiting per user

**Priority:** Medium

---

## Dependencies at Risk

### Outdated Prisma Usage Pattern
**Current:** Using `@prisma/client@^6.1.0`

**Risk:**
- Pool exhaustion with pgBouncer documented in comments
- Connection limit=1 enforced in PrismaService (workaround, not ideal)
- TypeORM still in package.json but unused (technical debt)

**Mitigation in place:** `connection_limit=1 & pool_timeout=30` in schema

**Recommendations:**
1. Remove unused TypeORM dependency
2. Monitor Prisma security advisories
3. Test pool configuration under load

**Priority:** Low

### Deprecated Faker Package
**Package:** `faker@^6.6.6` (old) + `@faker-js/faker@^10.1.0` (new)

**Risk:** Both installed, confusion in seed files

**Fix:** Remove old faker, ensure only `@faker-js/faker` is used

**Priority:** Low

### Node Version Pinning
**Current:** `.nvm/versions/node/v20.19.6/bin` hard-coded in scripts

**Risk:** Different developers may have different Node versions → different builds

**Fix:** Use `.nvmrc` file with `20.19.6`, document in README

**Priority:** Low

---

## Missing Critical Features

### Backup Strategy Not Documented
**Issue:** PostgreSQL database has no documented backup/restore procedure.

**Blocks:** Disaster recovery planning

**Fix approach:**
1. Document backup automation (daily + encrypted offsite)
2. Document restore procedure with test recovery
3. Set backup retention policy (30 days minimum)

**Priority:** High (data loss = business failure)

### Audit Trail Gaps
**Concern:** Medical system handles sensitive data. HIPAA/local laws may require audit trail.

**Current:**
- Audit middleware exists but unclear if enabled
- No deletion history
- No access logs for clinical records

**Blocks:** Regulatory compliance

**Fix approach:**
1. Verify audit middleware is active on all endpoints
2. Log patient record access
3. Implement soft-delete for compliance
4. Archive audit logs securely

**Priority:** High

### Lack of Error Tracking
**Observation:** No Sentry, DataDog, or similar error monitoring.

**Issue:** Production bugs only discovered by user reports.

**Blocks:** Proactive bug detection

**Fix approach:**
1. Integrate Sentry or similar
2. Alert on error spike
3. Log full stack traces with context

**Priority:** High

### Missing Load Testing
**Concern:** No documented performance benchmarks.

**Blocks:** Capacity planning

**Fix approach:**
1. Test: 50 concurrent users, 100 patients, 1000 appointments
2. Identify bottleneck (database, API, memory)
3. Document max capacity and scaling plan

**Priority:** Medium

---

## Migration & Data Integrity

### Migration Strategy Unclear
**Observation:** 13 migrations in history, newest from Feb 20 (CRM conversion).

**Risk:**
- Down migrations not verified
- Schema divergence if applied out of order
- Breaking changes not documented

**Fix approach:**
1. Document migration dependencies
2. Test rollback procedures
3. Implement migration verification on startup

**Priority:** Medium

### Decimal/Money Handling
**Pattern:** Prisma uses `Decimal` for financial amounts (good).

**Observation:** Some code converts to `Number` for calculations, losing precision.

Example: `reportes-financieros.service.ts:90` - `decimalToNumber()`

**Risk:** Rounding errors in financial reports

**Fix approach:**
1. Keep Decimal type throughout calculations
2. Only convert to Number for final display
3. Add test for rounding edge cases

**Priority:** Medium

---

## Summary by Priority

| Priority | Area | Impact |
|----------|------|--------|
| **High** | TypeScript strict mode disabled | Type safety, refactoring risk |
| **High** | Test coverage <6% | Regression risk, breaking changes |
| **High** | LocalStorage token storage | XSS vulnerability |
| **High** | Backup strategy not documented | Data loss risk |
| **High** | Audit trail gaps | Compliance, forensics |
| **High** | Error tracking missing | Production visibility |
| **High** | Unfinished features (TODOs) | Incomplete functionality |
| **Medium** | Large service files (700+ LOC) | Complexity, maintainability |
| **Medium** | Monster components (1000+ LOC) | Testing, reusability |
| **Medium** | Console logs in production | Log pollution, PII exposure |
| **Medium** | Error handling inconsistency | Client uncertainty, debugging |
| **Medium** | Fragile appointment logic | Race conditions, overbooking |
| **Medium** | Financial state fragility | Incorrect calculations |
| **Medium** | N+1 query patterns | Performance at scale |
| **Low** | Outdated dependencies | Security updates |
| **Low** | Missing database indexes | Query performance |

---

*Concerns audit: 2026-02-21*
