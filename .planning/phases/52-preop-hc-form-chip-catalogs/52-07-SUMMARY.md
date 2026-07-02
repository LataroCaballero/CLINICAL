---
phase: 52-preop-hc-form-chip-catalogs
plan: "07"
subsystem: frontend/components/live-turno
tags: [portal-link, qr-code, share-panel, smtp, email, preoperatorio]
dependency_graph:
  requires:
    - phase: 52
      plan: "04"
      provides: "portal-link endpoints (POST /pacientes/:id/portal-link + /portal-link/email)"
    - phase: 52
      plan: "06"
      provides: "PreoperatorioForm component with pacienteId prop"
  provides:
    - "usePortalLink hook: typed mutations for portal-link + portal-link/email endpoints"
    - "SharePortalPanel: copy / WhatsApp / QR / email share panel using backend-returned URL"
    - "PreoperatorioForm Compartir link section (PREOP-11/12)"
  affects: []
tech_stack:
  added:
    - "qrcode.react (QRCodeSVG component)"
  patterns:
    - "useMutation wrapping POST endpoints; pacienteId in URL path only (T-52-21)"
    - "SMTP gate: smtpConfigured flag controls email section visibility (D-13)"
    - "Backend URL verbatim: url string from response used as-is; no client-side hash/token construction (T-52-19)"
key_files:
  created:
    - frontend/src/hooks/usePortalLink.ts
    - frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx
  modified:
    - frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx
    - frontend/package.json
    - frontend/package-lock.json
decisions:
  - "qrcode.react chosen (QRCodeSVG export) — lightweight, React-native, renders locally (no network calls, T-52-SC)"
  - "WhatsApp link uses wa.me/?text= (no number) — opens contact picker per plan spec"
  - "Email control: if pacienteEmail is falsy, Input shown; email sent as optional body field only when different from stored email"
  - "alreadyGenerated informational note shown when backend returns alreadyGenerated:true"
  - "url kept in local state — not in TanStack Query cache (mutations are one-shot; the stable URL is display-only)"
metrics:
  duration: "15m"
  completed: "2026-06-26"
  tasks_completed: 3
  files_changed: 5
---

# Phase 52 Plan 07: SharePortalPanel + Compartir link Section Summary

Portal link share panel (PREOP-11/12): copy, WhatsApp, scannable QR, and SMTP-gated email with at-share email capture, wired into the prequirúrgico form via a "Compartir link" section at the bottom of PreoperatorioForm.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add qrcode.react dependency | 02c5147 | frontend/package.json, frontend/package-lock.json |
| 2 | usePortalLink hook | ef7556a | frontend/src/hooks/usePortalLink.ts |
| 3 | SharePortalPanel + wire into PreoperatorioForm | dd016d3 | frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx, PreoperatorioForm.tsx |

## What Was Built

### usePortalLink.ts

Two typed mutations:
- `useGenerarPortalLink()` — `POST /pacientes/${id}/portal-link` → `{ url: string | null, alreadyGenerated: boolean, smtpConfigured: boolean }`. Patient id is a URL path parameter only (never a body field — T-52-21).
- `useEnviarPortalLinkEmail()` — `POST /pacientes/${id}/portal-link/email` with optional `{ email?: string }` body → `{ enviado: boolean }`.

### SharePortalPanel.tsx

Props: `{ pacienteId: string; pacienteEmail?: string }`.

**Before link generation:** Shows a "Generar link del portal" button with loading state and error feedback. Calls `useGenerarPortalLink` on click.

**After link generation:**
- URL display (truncated monospace strip)
- `alreadyGenerated` informational note when applicable
- **Copiar link:** `navigator.clipboard.writeText(url)` with 2-second "Copiado" feedback
- **WhatsApp:** `<a href="https://wa.me/?text=...">` as a button (opens contact picker)
- **Ver QR:** toggle showing `<QRCodeSVG value={url} size={180} />` (qrcode.react, renders locally)
- **Email section (D-13 — SMTP-gated):** rendered only when `smtpConfigured === true`
  - If `pacienteEmail` is provided: shows destination and sends directly
  - If `pacienteEmail` is empty: shows an email Input before sending
  - Shows success/error feedback after send attempt

All share actions use the `url` string returned by the backend verbatim — no client-side hash or token construction (T-52-19).

### PreoperatorioForm.tsx (modification)

Added import of `SharePortalPanel` and a new "Compartir link" section at the bottom of the form:

```tsx
<section className="border-t pt-4 space-y-3">
  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
    Compartir link
  </h3>
  <SharePortalPanel
    pacienteId={pacienteId}
    pacienteEmail={paciente?.email ?? undefined}
  />
</section>
```

The `pacienteEmail` is read from `usePaciente(pacienteId)` which was already loaded by the pre-load pattern from Plan 06 — no additional fetch required.

## Verification

- `npx tsc --noEmit` — exits 0 (no errors)
- `qrcode.react` installed and resolvable: `node -e "require.resolve('qrcode.react')"` → OK
- All acceptance criteria grep checks: PASSED
- Note: `npm run build` fails in this environment due to Node 18 vs Next.js >=20.9.0 requirement (pre-existing constraint; documented in 52-06-SUMMARY.md)

## Deviations from Plan

None — plan executed exactly as written.

## Security Notes (Threat Register)

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-52-19 | SharePortalPanel uses the backend-returned `url` string directly; the sha256 hash is never received, constructed, or logged on the client |
| T-52-20 | Email control rendered only when `smtpConfigured === true`; email mutation fails-closed server-side |
| T-52-21 | `usePortalLink` mutations accept `pacienteId` as a function argument used only in the URL path |
| T-52-SC | `qrcode.react` reviewed (autonomous:false task); renders QR locally, makes no network calls |

## Known Stubs

None — SharePortalPanel calls real backend endpoints. The share functionality is fully wired.

## Self-Check: PASSED

- `frontend/src/hooks/usePortalLink.ts` — FOUND
- `frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx` — FOUND
- Commit 02c5147 (qrcode.react) — FOUND
- Commit ef7556a (usePortalLink) — FOUND
- Commit dd016d3 (SharePortalPanel + PreoperatorioForm) — FOUND

---
*Phase: 52-preop-hc-form-chip-catalogs*
*Completed: 2026-06-26*
