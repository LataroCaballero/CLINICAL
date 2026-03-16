---
phase: 12-schema-afip-extendido-gestion-certificados
verified: 2026-03-16T18:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 12: Schema AFIP Extendido + Gestion Certificados Verification Report

**Phase Goal:** El Admin puede configurar el certificado digital y punto de venta por tenant, y el sistema almacena toda la infraestructura de datos AFIP lista para emisión real
**Verified:** 2026-03-16T18:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Prisma schema contains ConfiguracionAFIP and CaeaVigente models | VERIFIED | `schema.prisma` lines 1188–1216; migration `20260316165125_add_afip_extendido_schema` applied |
| 2  | EstadoFactura enum includes CAEA_PENDIENTE_INFORMAR | VERIFIED | `schema.prisma` line 937 |
| 3  | AmbienteAFIP enum (HOMOLOGACION/PRODUCCION) exists | VERIFIED | `schema.prisma` lines 940–943 |
| 4  | Five nullable AFIP fields on Factura model | VERIFIED | `schema.prisma` lines 542–546 — cae, caeFchVto, nroComprobante, qrData, ptoVta all have `?` |
| 5  | Profesional model has configuracionAFIP and caeaVigentes relations | VERIFIED | `schema.prisma` lines 131–132 |
| 6  | POST /afip-config/cert extracts CUIT from cert PEM without manual entry | VERIFIED | `afip-config.service.ts` `extractCertInfo` handles both serialNumber=CUIT and CN=CUIT formats; unit tests pass (CERT-01) |
| 7  | GET /afip-config/status never exposes certPemEncrypted or keyPemEncrypted | VERIFIED | `afip-config.service.ts` `getStatus` select clause explicitly excludes both fields; controller has zero references to those fields; spec tests assert absence |
| 8  | Three REST endpoints wired in AfipConfigModule and registered in AppModule | VERIFIED | `afip-config.controller.ts` has GET/POST/PATCH; `app.module.ts` lines 28 and 75 import and register AfipConfigModule |
| 9  | EncryptionService from WhatsappModule encrypts cert+key before DB write | VERIFIED | `afip-config.module.ts` imports WhatsappModule; `afip-config.service.ts` `saveCert` calls `this.encryption.encrypt()` before upsert |
| 10 | Daily cron checks all ConfiguracionAFIP rows; alerts at 60d/30d/≤5d only | VERIFIED | `cert-expiry.scheduler.ts` `@Cron('0 8 * * *')` with guard `daysLeft === 60 \|\| daysLeft === 30 \|\| daysLeft <= 5`; 5 spec tests pass |
| 11 | Admin UI (AfipConfigTab) wired into Configuracion page for ADMIN and PROFESIONAL | VERIFIED | `configuracion/page.tsx` lines 50, 66–67, 114, 146–147 — AFIP tab in both role views |
| 12 | Facturador home badge visible only when cert is configured, correct colors | VERIFIED | `facturador/page.tsx` lines 75–89 — conditional render on `afipConfig?.configured`, green/yellow/red badge per certStatus |

**Score:** 12/12 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | ConfiguracionAFIP, CaeaVigente, AmbienteAFIP, CAEA_PENDIENTE_INFORMAR, 5 Factura fields | VERIFIED | All present; 5 Factura fields all nullable |
| `backend/src/prisma/migrations/20260316165125_add_afip_extendido_schema/migration.sql` | Applied migration SQL | VERIFIED | File exists |
| `backend/src/modules/afip-config/afip-config.service.ts` | extractCertInfo, saveCert, saveBillingConfig, getStatus | VERIFIED | 325 lines, all four methods present and substantive |
| `backend/src/modules/afip-config/afip-config.controller.ts` | GET /status, POST /cert, PATCH /billing | VERIFIED | 27 lines, three endpoints with @Auth('ADMIN','PROFESIONAL') guard |
| `backend/src/modules/afip-config/afip-config.module.ts` | WhatsappModule import, AfipConfigService + CertExpiryScheduler providers | VERIFIED | 18 lines, imports WhatsappModule, providers both registered |
| `backend/src/modules/afip-config/cert-expiry.scheduler.ts` | @Cron daily, daysLeft guard, nodemailer, SMTP fallback | VERIFIED | 90 lines, full implementation |
| `backend/src/modules/afip-config/dto/save-cert.dto.ts` | certPem, keyPem, ptoVta, ambiente | VERIFIED | Exists |
| `backend/src/modules/afip-config/dto/save-billing-config.dto.ts` | ptoVta, ambiente | VERIFIED | Exists |
| `backend/src/modules/afip-config/dto/afip-config-status.dto.ts` | AfipConfigStatusResponse, CertStatus | VERIFIED | Exists |
| `backend/src/modules/afip-config/afip-config.service.spec.ts` | Real tests for CERT-01/CERT-02/CERT-04 (not stubs) | VERIFIED | 12 real tests — no `expect(true).toBe(true)` stubs remain |
| `backend/src/modules/afip-config/cert-expiry.scheduler.spec.ts` | Real tests for CERT-03 (not stubs) | VERIFIED | 5 real tests — no stubs remain |
| `frontend/src/types/afip.ts` | AfipConfigStatusResponse, CertStatus, SaveCertRequest, SaveBillingConfigRequest | VERIFIED | Exists |
| `frontend/src/hooks/useAfipConfig.ts` | useQuery GET /afip-config/status | VERIFIED | 13 lines, TanStack Query hook, correct queryKey |
| `frontend/src/hooks/useSaveCert.ts` | useMutation POST /afip-config/cert | VERIFIED | Exists, invalidates afip-config-status on success |
| `frontend/src/hooks/useSaveBillingConfig.ts` | useMutation PATCH /afip-config/billing | VERIFIED | Exists, invalidates afip-config-status on success |
| `frontend/src/app/dashboard/configuracion/components/AfipConfigTab.tsx` | Two-section form, preview modal, status view toggle, "Validando con AFIP..." | VERIFIED | 678 lines, uses useAfipConfig/useSaveCert/useSaveBillingConfig, Dialog, isEditingCert state, loading text |
| `frontend/src/app/dashboard/facturador/page.tsx` | Badge conditional on configured, verde/amarillo/rojo | VERIFIED | Lines 75–89, conditional render, three color classes per certStatus |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `afip-config.module.ts` | WhatsappModule (EncryptionService) | imports array | WIRED | `WhatsappModule` in imports at line 9 |
| `afip-config.service.ts` | `prisma.configuracionAFIP` | upsert on saveCert | WIRED | Line 123: `prisma.configuracionAFIP.upsert(...)` |
| `app.module.ts` | AfipConfigModule | imports array | WIRED | Lines 28 (import) and 75 (in imports array) |
| `cert-expiry.scheduler.ts` | `prisma.configuracionAFIP` | findMany with certExpiresAt filter | WIRED | Line 21: `prisma.configuracionAFIP.findMany(...)` |
| `cert-expiry.scheduler.ts` | nodemailer | createTransport().sendMail() | WIRED | Lines 57–83, nodemailer.createTransport pattern |
| `AfipConfigTab.tsx` | GET /afip-config/status | useAfipConfig hook | WIRED | Line 4: import; line 61: `useAfipConfig()` called |
| `AfipConfigTab.tsx` | POST /afip-config/cert | useSaveCert mutation | WIRED | Line 5: import; line 62: `useSaveCert()` called |
| `facturador/page.tsx` | certStatus badge | useAfipConfig hook | WIRED | Line 19: import; line 40: `useAfipConfig()`; lines 75–89: conditional badge render |
| `configuracion/page.tsx` | AfipConfigTab | direct component usage | WIRED | Line 19: import; lines 67 and 147: `<AfipConfigTab />` in both role views |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AFIP-01 | 12-01 | Sistema almacena ConfiguracionAFIP (cert+key AES-256-GCM), campos Factura AFIP, CaeaVigente, EstadoFactura.CAEA_PENDIENTE_INFORMAR | SATISFIED | All models in schema.prisma; migration applied; Prisma relations on Profesional confirmed |
| CERT-01 | 12-02 | Admin sube cert digital con validación automática — CUIT extraído del CN, ptoVta verificado via FEParamGetPtosVenta | SATISFIED | `extractCertInfo` handles both serialNumber=CUIT and CN=CUIT; `validatePtoVta` calls FEParamGetPtosVenta SOAP; 4 spec tests for CERT-01 pass |
| CERT-02 | 12-02, 12-04 | Admin configura ambiente (HOMO/PROD), ptoVta, ve estado del certificado en pantalla dedicada | SATISFIED | Three REST endpoints implemented; AfipConfigTab frontend with two-section form; AFIP tab in configuracion page for both roles |
| CERT-03 | 12-03 | Sistema envía email al Admin 30 y 60 días antes del vencimiento | SATISFIED | CertExpiryScheduler `@Cron('0 8 * * *')` with guard `=== 60 \|\| === 30 \|\| <= 5`; 5 unit tests all pass |
| CERT-04 | 12-02, 12-04 | Facturador ve badge estado certificado (OK / venciendo / no configurado) en su home | SATISFIED | `facturador/page.tsx` lines 75–89: badge renders only when `configured=true`, three color states correct |

No orphaned requirements found — all five requirement IDs (AFIP-01, CERT-01, CERT-02, CERT-03, CERT-04) are claimed in plan frontmatter and verified in codebase.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/app/dashboard/components/PatientsTable.tsx` | 73–75 | Pre-existing TS2322/TS7006 prop mismatch on NewPacienteModal | Info (pre-existing) | Does not affect AFIP Phase 12 functionality; documented in `deferred-items.md`; pre-dates Phase 12 |

No blocker anti-patterns found in Phase 12 files. No `expect(true).toBe(true)` stubs remain in spec files. No `TODO`/`FIXME`/`PLACEHOLDER` comments in implementation files. No `return null` / empty handler stubs.

---

## Human Verification Required

### 1. AFIP Tab Visibility and Cert Save Flow

**Test:** Navigate to `/dashboard/configuracion` as ADMIN and PROFESIONAL. Verify the AFIP tab appears. Paste invalid cert text + ptoVta + ambiente. Click save — verify preview modal appears with ambiente prominent. Click confirm — verify "Validando con AFIP..." loading state appears, then an error toast (not a 500 screen).
**Expected:** Tab visible, preview modal shown, loading text present, error surfaced as toast.
**Why human:** Visual layout, toast notification behavior, and WSAA error handling path require browser rendering.

### 2. Textareas Empty in Edit Mode (Security Check)

**Test:** After any cert is saved, click "Actualizar certificado" to enter edit mode.
**Expected:** Both textareas are completely empty — no cert PEM content pre-filled.
**Why human:** Security assertion requires actual browser observation; API never returns cert content but local state management must also not persist it.

### 3. Facturador Badge Conditional Display

**Test:** Log in as FACTURADOR. Go to `/dashboard/facturador`. With no cert configured: badge should be absent. With a configured cert: badge should appear above KPIs with correct color.
**Expected:** Badge absent when unconfigured; green/yellow/red when configured based on certExpiresAt.
**Why human:** Requires live data state (cert configured vs not) and visual color verification.

### 4. WSAA Validation Rejects Non-RECE Point of Sale

**Test:** Upload a valid AFIP cert (HOMOLOGACION) with a ptoVta that is not type RECE.
**Expected:** HTTP 400 with Spanish message "El punto de venta N no existe o no es de tipo RECE (CAE)."
**Why human:** Requires real AFIP HOMOLOGACION certificate and SOAP network call; cannot be verified statically.

---

## Notes

- The pre-existing TypeScript error in `PatientsTable.tsx` (prop mismatch on `NewPacienteModal`) was confirmed pre-existing before Phase 12 and is documented in `deferred-items.md`. It does not affect any Phase 12 deliverable.
- `ScheduleModule.forRoot()` is correctly absent from `AfipConfigModule` — only a comment references it. The scheduler relies on the global registration already present in `ReportesModule` and `PacientesModule`.
- Prisma generated client could not be verified via `node_modules/.prisma/client/index.d.ts` (directory access restricted), but the schema file and migration SQL are confirmed present and correct. The SUMMARY confirms `npx prisma generate` ran cleanly.
- All 8 commits documented across the four SUMMARYs are verified to exist in git history.

---

_Verified: 2026-03-16T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
