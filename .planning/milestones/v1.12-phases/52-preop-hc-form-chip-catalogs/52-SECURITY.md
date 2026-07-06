---
phase: 52
slug: preop-hc-form-chip-catalogs
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-26
---

# Phase 52 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Plans audited: 52-01 through 52-08. Threats closed: 33 / 33. **Status: SECURED.**
> `register_authored_at_plan_time: true` — every plan carried a `<threat_model>` block; this audit verified each plan-time mitigation exists in the implemented code.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Prisma migration → live DB | Schema change applied to production-shaped DB | DDL (additive table create) |
| client → catalog API | Untrusted `profesionalId` override could leak/poison another professional's catalog | catalog rows, JWT scope |
| client → crearEntrada | Untrusted DTO arrays + consent flags; `profesionalId` must come from JWT not body | HC entry payload (PHI) |
| client → portal-link API | Token must never leak in plaintext at rest; only staff may mint links | raw UUID (once), sha256 hash |
| browser (staff) → email controller body | `url` travels in client body; reflected into outbound email HTML | portal URL, recipient email |
| backend → patient email | Email send must fail closed when SMTP absent | recipient address, portal URL |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-52-01 | Denial of Service | prisma migrate | mitigate | Additive-only migration (no `--accept-data-loss`); drift-safe. `backend/src/prisma/migrations/.../migration.sql`, 52-01-SUMMARY.md | closed |
| T-52-02 | Tampering | AntecedenteCatalogoPro scope | mitigate | `@@unique([nombre, profesionalId])` — `schema.prisma:1471` | closed |
| T-52-SC (P01) | Tampering | npm/prisma installs | accept | No new packages; prisma vendored | closed |
| T-52-03 | Information Disclosure / Tampering | catalog GET + learning | mitigate | `getProfesionalId(req.user, profesionalId)` on all three flat GET handlers — `catalogo-hc.controller.ts:72-97`; body never read for scope | closed |
| T-52-04 | Elevation of Privilege | system catalog rows | mitigate | No Patch/Delete for flat rows; `esSistema` → `ForbiddenException` on zone/dx/tx — `catalogo-hc.service.ts:719,752,785,818,848,868` | closed |
| T-52-05 | Tampering | catalog cross-tenant write | mitigate | `aprenderDesdeFlat` writes `{ nombre, profesionalId, esSistema:false }` from resolved scope arg — `catalogo-hc.service.ts:419-421`; `@@unique` blocks injection | closed |
| T-52-SC (P02) | Tampering | npm installs | accept | No new packages | closed |
| T-52-06 | Tampering | learning scope | mitigate | JWT-derived `profesionalId` arg to `aprenderDesdePreoperatorio` — `historia-clinica.service.ts:391-394`; DTO has no `profesionalId` | closed |
| T-52-07 | Tampering | profile arrays | mitigate | `Array.from(new Set([...existing, ...incoming]))` per field — `historia-clinica.service.ts:297-309`; no destructive overwrite | closed |
| T-52-08 | Repudiation | consent audit | mitigate | `consentimientoInformadoAt` ISO timestamp in JSONB — `historia-clinica.service.ts:112-114`; `consentimientoFirmadoAt` never assigned in this branch | closed |
| T-52-09 | Denial of Service | learning failure | accept | Best-effort post-transaction; `try/catch` + `logger.warn`; never rolls back HC save | closed |
| T-52-SC (P03) | Tampering | npm installs | accept | No new packages | closed |
| T-52-10 | Information Disclosure | portalToken at rest | mitigate | `createHash('sha256')` hash persisted; raw UUID never written — `pacientes.service.ts:1057-1066`; `schema.prisma:217` | closed |
| T-52-11 | Tampering | token regeneration | mitigate | Early return when `portalToken` already set; no re-hash, no DB update — `pacientes.service.ts:1052-1054` | closed |
| T-52-12 | Elevation of Privilege | who can mint links | mitigate | Class-level `@Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR')` — `pacientes.controller.ts:38`; id from `@Param` only | closed |
| T-52-13 | Information Disclosure | email misfire | mitigate | `enviarLinkPortal` returns `false` when SMTP unconfigured — `portal-email.service.ts:61`; `smtpConfigured` flag exposed | closed |
| T-52-SC (P04) | Tampering | npm installs | accept | nodemailer already vendored | closed |
| T-52-14 | Spoofing | catalog requests | mitigate | Shared `api` axios instance attaches JWT — `useAntecedentesCatalogo.ts:1,16` (+ alergias/medicamentos); backend re-derives scope | closed |
| T-52-15 | Information Disclosure | profesionalId in query | accept | Non-secret advisory scoping hint; backend authorizes server-side | closed |
| T-52-SC (P05) | Tampering | npm installs | accept | No new packages | closed |
| T-52-16 | Tampering | catalog scope | mitigate | `profesionalId` prop from professional-context store/JWT — `PreoperatorioForm.tsx:36,89-93`; no user-entered field | closed |
| T-52-17 | Information Disclosure | consent semantics | mitigate | Label "El paciente fue informado…" (no signature wording) — `PreoperatorioForm.tsx:577-580`; `consentimientoFirmadoAt` untouched | closed |
| T-52-18 | Tampering | profile pre-load | accept | Read-only display; server-side union-dedup merge (T-52-07) authoritative | closed |
| T-52-SC (P06) | Tampering | npm installs | accept | No new packages | closed |
| T-52-19 | Information Disclosure | portal token in client | mitigate | UI consumes only backend `url`; sha256 never in response; no `console.log` of url — `SharePortalPanel.tsx`, `usePortalLink.ts` | closed |
| T-52-20 | Information Disclosure | email misfire | mitigate | Email section gated `{smtpConfigured && ...}` — `SharePortalPanel.tsx:212-213`; server fails closed | closed |
| T-52-21 | Tampering | patient scope | mitigate | `pacienteId` in URL path only — `usePortalLink.ts:34,57-58`; staff `@Auth` guard | closed |
| T-52-SC (P07) | Tampering | qrcode.react install | mitigate | `qrcode.react` renders locally, no network; reviewed before install (autonomous:false) | closed |
| P08-T-52-01 | Tampering / Injection | `enviarPortalLinkEmail` body.url | mitigate | `esPortalUrlValida` requires same origin as FRONTEND_URL + `/portal/<uuid>` path, rejects non-empty search/hash (CR-01) — `portal-url.helper.ts:32-64`; controller reflects canonical `urlSegura` not raw `dto.url` — `pacientes.controller.ts:260,283` | closed |
| P08-T-52-02 | Elevation of Privilege / IDOR | pacienteId scope | accept | Path param under staff `@Auth`; never body for auth (WR-04 architectural follow-up) | closed |
| P08-T-52-03 | Information Disclosure | raw UUID in DB | accept | D-12 intact: email endpoint no longer re-derives/persists raw UUID; forwards client url | closed |
| P08-T-52-04 | Spoofing | email recipient | mitigate | Recipient from `findUnique` `paciente.email` — `pacientes.controller.ts:268-277`; no recipient → `motivo:'sin_destinatario'`; `dto.email` validated via `EMAIL_SHAPE` — `pacientes.service.ts:1082-1086` | closed |
| P08-T-52-SC | n/a | npm installs | accept | No new dependencies | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-52-01 | T-52-SC (P01–P06) | No new packages in respective plans; prisma/nodemailer already vendored | gsd-security-auditor | 2026-06-26 |
| AR-52-02 | T-52-09 | Learning failure is best-effort post-transaction by design; never blocks/rolls back HC saves | gsd-security-auditor | 2026-06-26 |
| AR-52-03 | T-52-15 | `profesionalId` query param is a non-secret advisory hint; backend re-authorizes server-side | gsd-security-auditor | 2026-06-26 |
| AR-52-04 | T-52-18 | Frontend profile pre-load is read-only display; authoritative merge is server-side (T-52-07) | gsd-security-auditor | 2026-06-26 |
| AR-52-05 | P08-T-52-02 | `pacienteId` as path param under staff `@Auth`; IDOR risk documented as architectural follow-up (WR-04) | gsd-security-auditor | 2026-06-26 |
| AR-52-06 | P08-T-52-03 | D-12 design decision: raw UUID unrecoverable after generation; client forwards its held URL | gsd-security-auditor | 2026-06-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Code Review Findings (REVIEW.md — informational)

Recorded for traceability. Not part of the plan-time threat register; do not affect the SECURED verdict.

| Finding | Status | Notes |
|---------|--------|-------|
| CR-01: URL query/fragment bypass + raw `dto.url` reflected into email | **Resolved** (commit 1f24574) | `esPortalUrlValida` rejects non-empty search/hash; controller reflects canonical `urlSegura` |
| WR-01: `dto.email` persisted with no runtime validation | **Resolved** (commit 1f24574) | `setEmailSiFalta` validates against `EMAIL_SHAPE` before persisting |
| WR-02: Existing-token patient cannot retrieve share link (UX) | Open follow-up | Architectural; out of phase scope per REVIEW.md |
| WR-03: UUID ownership not verified before email send | Open follow-up | Architectural (token-ownership under D-12); out of phase scope |
| WR-04: No tenant/professional scoping on portal endpoints | Open follow-up | Pre-existing pattern in `PacientesController`; architectural |
| IN-01 … IN-04 | Informational | v4 UUID nibble, FRONTEND_URL default, capture-on-entry email, pre-existing PII console.log — no active exploit path |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-26 | 33 | 33 | 0 | gsd-security-auditor (secure-phase) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-26
