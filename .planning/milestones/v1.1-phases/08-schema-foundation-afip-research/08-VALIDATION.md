---
phase: 8
slug: schema-foundation-afip-research
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (via ts-jest) |
| **Config file** | `backend/package.json` → `jest` key (rootDir: `src`, testRegex: `.*\.spec\.ts$`) |
| **Quick run command** | `cd backend && npx prisma validate && npx tsc --noEmit` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~30 seconds (validate + tsc), ~60s full suite |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx prisma validate && npx tsc --noEmit`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Both commands must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | SCHEMA-01 | manual | `cd backend && npx prisma validate` | ❌ W0 (migration) | ⬜ pending |
| 8-01-02 | 01 | 1 | SCHEMA-02 | manual | `cd backend && npx prisma validate && npx prisma generate` | ❌ W0 (migration) | ⬜ pending |
| 8-01-03 | 01 | 1 | SCHEMA-03 | manual | `cd backend && npx tsc --noEmit` | ❌ W0 (migration) | ⬜ pending |
| 8-02-01 | 02 | 2 | AFIP-01 | manual | `ls .planning/research/AFIP-INTEGRATION.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Note:** SCHEMA-01 through SCHEMA-03 are pure schema changes. Verification is via `prisma validate`, `prisma migrate dev`, and `npx tsc --noEmit`. No unit test files are created for migrations — this is standard practice in this repo. AFIP-01 is a documentation deliverable verified by file existence and content review.

---

## Wave 0 Requirements

- [ ] `.planning/research/AFIP-INTEGRATION.md` — stub/placeholder for AFIP-01 (plan 08-02 fills content)
- [ ] Migration directory `backend/src/prisma/migrations/YYYYMMDDHHMMSS_facturador_v1/` — for SCHEMA-01/02/03

*Schema migrations and research docs don't need test stubs — `prisma validate` + `tsc --noEmit` cover schema; file existence covers AFIP-01.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `PracticaRealizada` has all 4 new fields in DB | SCHEMA-01 | Schema migration — no unit test needed | Run `npx prisma migrate dev` without error; confirm with `npx prisma studio` or `SELECT column_name FROM information_schema.columns WHERE table_name='PracticaRealizada'` |
| `LimiteFacturacionMensual` accessible from client | SCHEMA-02 | ORM client generation — compile check sufficient | `npx prisma generate` succeeds; `npx tsc --noEmit` passes |
| `Factura.condicionIVAReceptor` non-nullable in client | SCHEMA-03 | Type change + enum — compile check sufficient | `npx tsc --noEmit` after generate; check `finanzas.dto.ts` and `finanzas.service.ts` compile |
| AFIP-INTEGRATION.md covers all required sections | AFIP-01 | Documentation — content review only | File exists at `.planning/research/AFIP-INTEGRATION.md`; contains sections: certificados, WSAA, WSFEv1, CAEA, RG 5616/2024, biblioteca recomendada |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
