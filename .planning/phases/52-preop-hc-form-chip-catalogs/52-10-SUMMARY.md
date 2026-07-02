---
phase: 52-preop-hc-form-chip-catalogs
plan: "10"
subsystem: frontend/portal-link
tags: [gap-closure, portal, tanstack-query, useQuery, react, smtp]
dependency_graph:
  requires:
    - phase: 52-09
      provides: "GET /pacientes/:id/portal-link (sólo lectura) — ObtenerPortalLinkResponse {url, alreadyGenerated, legacy, smtpConfigured}"
  provides:
    - useObtenerPortalLink — useQuery GET portal-link on mount en usePortalLink.ts
    - SharePortalPanel renderiza link existente al montar; spinner acotado; sin dead-spinner
    - Banner email con código SMTP real (EAUTH/ECONNECTION/etc) para diagnóstico — T-52-12
  affects: [SharePortalPanel, portal-email.service, pacientes.controller]
tech_stack:
  added: []
  patterns:
    - "useQuery GET-only en mount + setQueryData tras mutation (TanStack Query — consistencia cache)"
    - "Spinner acotado solo durante primer fetch; siempre resuelve a vista-link o vista-generar"
    - "surface error.code nodemailer (enum corto); nunca mensaje/host/credenciales (T-52-12)"
key_files:
  created: []
  modified:
    - frontend/src/hooks/usePortalLink.ts
    - frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx
    - backend/src/modules/pacientes/portal-email.service.ts
    - backend/src/modules/pacientes/pacientes.controller.ts
key_decisions:
  - "useQuery con queryKey ['portal-link', pacienteId] para GET de sólo lectura; nunca mutation"
  - "handleGenerar actualiza cache via queryClient.setQueryData para consistencia sin refetch adicional"
  - "portal-email.service retorna { enviado, codigo? } en vez de bool; codigo = error.code SMTP (T-52-12)"
patterns_established:
  - "TanStack Query: GET de sólo lectura en mount → estado derivado via useEffect; mutation actualiza cache via setQueryData"
requirements_completed: [PREOP-12]
duration: ~10min
completed: "2026-06-26"
---

# Phase 52 Plan 10: Portal Link Frontend — Mount-Load y SMTP Error Code (Gap B Cierre) Summary

useObtenerPortalLink (useQuery GET portal-link on mount) + SharePortalPanel que carga url existente al montar; nunca dead-spinner; banner email con código SMTP real (EAUTH/ECONNECTION/etc).

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-26T19:30:00Z
- **Completed:** 2026-06-26T19:40:00Z
- **Tasks:** 2 (Task 1 obligatorio + Task 2 opcional implementada)
- **Files modified:** 4

## Accomplishments

- `useObtenerPortalLink` hook (useQuery GET /pacientes/:id/portal-link) añadido a `usePortalLink.ts`; queryKey `['portal-link', pacienteId]` compartida con handleGenerar
- `SharePortalPanel` consulta el link en mount: spinner acotado → vista-link (si url) o vista-generar (si sin token / legacy); nunca spinner infinito
- Task 2 opcional implementada: `portal-email.service.enviarLinkPortal` devuelve `{ enviado, codigo? }` con el `error.code` de nodemailer; controller propaga `codigo` al response; banner frontend muestra el código SMTP real

## Task Commits

1. **Task 1: Frontend — cargar link portal en mount** - `9a93acc` (feat)
2. **Task 2 (opcional): surface código error SMTP** - `0b5a519` (feat)

## Files Created/Modified

- `frontend/src/hooks/usePortalLink.ts` — Agrega `ObtenerPortalLinkResponse`, `useObtenerPortalLink` (useQuery), `codigo?` en `EnviarPortalLinkEmailResponse`
- `frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx` — Importa `useObtenerPortalLink`, `useQueryClient`; useEffect de init desde `actual`; spinner acotado; setQueryData tras generar; banner con código SMTP
- `backend/src/modules/pacientes/portal-email.service.ts` — `enviarLinkPortal` retorna `{ enviado, codigo? }` en vez de bool; sólo expone `error.code`
- `backend/src/modules/pacientes/pacientes.controller.ts` — Adapta endpoint email al nuevo retorno; propaga `codigo` cuando disponible

## Decisions Made

- `useQuery` (no mutation) para el GET de sólo lectura en mount — idempotente, se beneficia de cache y deduplicación automática
- `queryClient.setQueryData(['portal-link', pacienteId], ...)` tras generar exitoso evita refetch innecesario y mantiene consistencia
- `portal-email.service` retorna objeto en vez de bool para poder propagar el código SMTP sin romper callers existentes del controller
- `error.code` de nodemailer (EAUTH, ECONNECTION, ETIMEDOUT, etc.) es el enum corto seguro; nunca se incluye el mensaje completo, host, user ni pass (T-52-12)

## Deviations from Plan

None — plan ejecutado exactamente como escrito. Task 2 fue marcada opcional y fue implementada dentro del presupuesto disponible.

## Security Verification

| Amenaza | Estado |
|---------|--------|
| T-52-12: filtrado de credenciales SMTP en banner | Mitigado — sólo se expone `error.code` (enum corto); catch descarta el mensaje completo y todo el objeto de error |
| T-52-01 (regression guard): validarPortalUrl | Intacto — controller no tocado salvo el retorno del envío de email |
| T-52-SC: npm installs | No aplicable — sin paquetes nuevos |

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Gap B (52-UAT Test 13) cerrado: frontend ya muestra link existente al montar para pacientes con token generado; para legacy/sin-token muestra el botón Generar
- Gap A (delivery email) ya resuelto por infra/DNS (anotado en 52-09 SUMMARY como "Test 13 — email send still fails + existing-link regression")
- Phase 53 puede proseguir: ThrottlerModule wiring antes del primer endpoint público del portal (Phase 54)

## Self-Check: PASSED

- [x] `frontend/src/hooks/usePortalLink.ts` — FOUND, contiene `useObtenerPortalLink`
- [x] `frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx` — FOUND, importa `useObtenerPortalLink`
- [x] `backend/src/modules/pacientes/portal-email.service.ts` — FOUND, `enviarLinkPortal` retorna `{ enviado, codigo? }`
- [x] `backend/src/modules/pacientes/pacientes.controller.ts` — FOUND, propaga `codigo` en respuesta email
- [x] `npx tsc --noEmit` frontend — sin errores TS nuevos
- [x] `npx tsc --noEmit -p tsconfig.build.json` backend — sin errores TS nuevos
- [x] Commits `9a93acc`, `0b5a519` — presentes en git log

---
*Phase: 52-preop-hc-form-chip-catalogs*
*Completed: 2026-06-26*
