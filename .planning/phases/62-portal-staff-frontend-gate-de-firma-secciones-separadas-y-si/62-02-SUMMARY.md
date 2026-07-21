---
phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si
plan: 02
subsystem: ui
tags: [portal, react-query, indicaciones, acuse, xss-guard]

# Dependency graph
requires:
  - phase: 62-01
    provides: "Hook useAcusarIndicaciones (POST /paciente-portal/public/indicaciones/acuse) + PortalConsentimiento.tsx limpio de indicaciones"
provides:
  - "Sección 'Indicaciones' propia en el acordeón del portal, separada de 'Consentimiento' (INDIC-01)"
  - "Acuse de lectura automático al abrir el link de indicaciones, sin firma dibujada ni paso extra (INDIC-02)"
  - "Componente net-new PortalIndicaciones.tsx que reusa el GET /consentimiento existente sin backend nuevo (D-04)"
affects: ["62-03 (indicacionesLeidasAt display)", "portal UAT checkpoint de fase"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reuso de useConsentimientosParaFirmar(true) filtrando zonas PARA_FIRMAR con indicacionesUrl no nulo, sin endpoint nuevo"
    - "Guard XSS safeIndicacionesUrl (^https?://) copiado 1:1 de PortalConsentimiento.tsx, recreado localmente en el componente nuevo"
    - "Acuse set-once disparado en onClick del link (no en expandir acordeón ni en checkbox)"

key-files:
  created:
    - "frontend/src/components/portal/PortalIndicaciones.tsx"
  modified:
    - "frontend/src/app/portal/[token]/page.tsx"

key-decisions:
  - "El acuse se dispara en cada click del link (backend idempotente/set-once); no se agregó guard local de sesión por no ser crítico, per discreción del plan"
  - "Sección 'Indicaciones' insertada como 4ª de 5 (entre Consentimiento y Consultas), icono ClipboardList ámbar"

patterns-established:
  - "Componentes de sección del portal que reusan un GET existente filtrando el discriminated union por campo opcional (patrón replicable para futuras sub-secciones sin backend nuevo)"

requirements-completed: [INDIC-01, INDIC-02]

# Metrics
duration: 3min
completed: 2026-07-21
---

# Phase 62 Plan 02: Sección "Indicaciones" del Portal Summary

**Componente net-new `PortalIndicaciones.tsx` que lista indicaciones preop por zona (reusando el GET de consentimiento existente) y dispara el acuse de lectura automáticamente al abrir el link, cableado como 5ª sección independiente del acordeón del portal.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-21T15:39:38Z
- **Completed:** 2026-07-21T15:41:48Z
- **Tasks:** 2/2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `PortalIndicaciones.tsx` creado: consume `useConsentimientosParaFirmar(true)`, filtra zonas `PARA_FIRMAR` con `indicacionesUrl` no nulo, aplica guard `^https?://` y dispara `useAcusarIndicaciones().mutate()` en el `onClick` del link (INDIC-02)
- Empty state (`text-gray-500`) cuando ninguna zona tiene indicaciones cargadas, sin disparar request
- `page.tsx`: nueva sección "Indicaciones" en `SECCIONES` y `AccordionItem value="indicaciones"`, separada de `value="consentimiento"` (INDIC-01)
- "Paso X de N" se recalcula solo (deriva de `SECCIONES.length`, sin hardcode)
- `npm run build` (Node 20 vía nvm) termina en exit 0, 33 rutas generadas incl. `/portal/[token]`

## Task Commits

Each task was committed atomically:

1. **Task 1: Crear componente PortalIndicaciones.tsx** - `c2215fd` (feat)
2. **Task 2: Cablear la 5ª sección "Indicaciones" en page.tsx** - `d90c474` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `frontend/src/components/portal/PortalIndicaciones.tsx` - Sección Indicaciones: fetch reusado (GET /consentimiento), guard XSS local, acuse on-click, empty state
- `frontend/src/app/portal/[token]/page.tsx` - Import de `PortalIndicaciones` + ícono `ClipboardList`; entrada `indicaciones` en `SECCIONES`; nuevo `AccordionItem` entre "Consentimiento" y "Consultas"

## Decisions Made
- Ninguna decisión nueva fuera de las ya registradas en D-04/D-05/D-07 (62-CONTEXT.md); layout/ícono/copy se resolvieron a discreción siguiendo el patrón visual existente de `PortalConsentimiento.tsx`.

## Deviations from Plan

### Auto-fixed Issues

None que ameriten Regla 1/2/3/4 — ambas tareas se ejecutaron tal como estaban especificadas.

### Nota sobre criterio de aceptación con falso positivo

El `acceptance_criteria` de Task 1 pide `grep -c "PortalConsentimiento\|consentimiento/firmar\|SignaturePad" ... retorna 0`. El componente importa correctamente `useConsentimientosParaFirmar`/`useAcusarIndicaciones` desde `@/hooks/usePortalConsentimiento` (per contrato del plan) — esa ruta de import contiene la subcadena literal `PortalConsentimiento`, generando 1 match inevitable. No hay contenido real de firma/consentimiento en el archivo (sin `SignaturePad`, sin `consentimiento/firmar`, sin uso del componente `PortalConsentimiento`). El `<verify><automated>` real del task (el gate que efectivamente bloquea) no incluye este grep y pasó en verde (`OK`). Se documenta como nota, no como deviation de código.

**Total deviations:** 0 auto-fixed
**Impact on plan:** Ninguno — plan ejecutado según lo escrito; única observación es un criterio de aceptación textual con colisión de substring inevitable dado el import path requerido por el propio plan.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs

Ninguno. `PortalIndicaciones` está completamente cableado: fetch real, guard real, mutación real, y consumido desde `page.tsx`.

## Threat Flags

Ninguno nuevo. El `threat_model` del plan (T-62-04/05/06) ya cubre toda la superficie modificada — guard XSS aplicado exactamente como especificado, mutación vía `portalApi` (JWT portal-scoped), sin endpoints ni rutas de auth nuevas.

## Next Phase Readiness
- INDIC-01 e INDIC-02 completados; portal tiene 5 secciones navegables con Indicaciones separada de Consentimiento.
- Listo para el checkpoint de UAT manual de fase (abrir portal, expandir Indicaciones, click en link → verificar POST /indicaciones/acuse en red).
- Ningún bloqueo para 62-03 (ya ejecutado en wave 1, independiente).

---
*Phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si*
*Completed: 2026-07-21*
