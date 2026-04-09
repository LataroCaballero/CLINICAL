---
phase: 12
slug: schema-afip-extendido-gestion-certificados
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (NestJS default) |
| **Config file** | `backend/package.json` (`"test"` script) |
| **Quick run command** | `cd backend && npm test -- --testPathPattern=afip-config --passWithNoTests` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~30 seconds (quick), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern=afip-config --passWithNoTests`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | AFIP-01 | type check | `cd backend && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 0 | CERT-01 | unit | `cd backend && npm test -- --testPathPattern=afip-config.service` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 0 | CERT-03 | unit | `cd backend && npm test -- --testPathPattern=cert-expiry.scheduler` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | AFIP-01 | type check | `cd backend && npx tsc --noEmit` | ✅ after W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | CERT-01 | unit | `cd backend && npm test -- --testPathPattern=afip-config.service` | ✅ after W0 | ⬜ pending |
| 12-02-03 | 02 | 1 | CERT-02 | unit | `cd backend && npm test -- --testPathPattern=afip-config.service` | ✅ after W0 | ⬜ pending |
| 12-03-01 | 03 | 1 | CERT-03 | unit | `cd backend && npm test -- --testPathPattern=cert-expiry.scheduler` | ✅ after W0 | ⬜ pending |
| 12-04-01 | 04 | 2 | CERT-04 | unit | `cd backend && npm test -- --testPathPattern=afip-config.service` | ✅ after W0 | ⬜ pending |
| 12-04-02 | 04 | 2 | CERT-02 | manual | See manual verifications below | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/afip-config/afip-config.service.spec.ts` — stubs for CERT-01, CERT-02, CERT-04
- [ ] `backend/src/modules/afip-config/cert-expiry.scheduler.spec.ts` — stubs for CERT-03
- [ ] Run Prisma migration: `cd backend && npx prisma migrate dev --name add_afip_extendido_schema`
- [ ] Run `npx prisma generate` after migration — required for TypeScript types on new models
- [ ] Check exhaustive switch breaks: `grep -r "EstadoFactura" backend/src/ --include="*.ts"` after generate

*(No framework install needed — `@nestjs/schedule` v6.1.0 already in `backend/package.json`.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Preview modal shows correct CUIT, expiry date, and ambiente before save | CERT-01 | Browser UI flow requires human verification | Navigate to Configuración → AFIP, paste valid PEM cert + key, verify modal appears with correct data before confirming |
| Badge on Facturador home shows correct color state | CERT-04 | Visual color rendering requires human verification | Log in as Facturador, verify badge color matches cert state (green/yellow/red) |
| FEParamGetPtosVenta rejected ptoVta shows error to user | CERT-01 | Requires live AFIP homologacion access | Submit cert save with invalid ptoVta number, verify HTTP 400 error shown in UI |
| AFIP unavailable returns 503 error to user | CERT-01 | Requires simulating AFIP downtime | Configure invalid AFIP URL, verify "AFIP no está disponible" error message shown |
| Cert/key textareas empty in edit mode | CERT-02 | Security — verify no secrets leak to browser | Open AFIP tab after cert saved, enter edit mode, verify textareas are empty |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
