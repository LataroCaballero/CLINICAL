---
phase: 69-consistencia-de-tel-fono-opcional-frontend
plan: 04
subsystem: ui
tags: [react, nextjs, typescript, telefono, placeholder]

# Dependency graph
requires:
  - phase: 69-consistencia-de-tel-fono-opcional-frontend (plan 01)
    provides: "frontend/src/lib/telefono.ts con formatTelefono y tieneTelefono"
provides:
  - "Los 5 sitios de display de teléfono (ficha de paciente, live-turno, autosuggest, lista de espera, 3 columnas de reportes) usan el helper único del plan 01"
  - "Placeholder consistente '-' en ficha, live-turno y reportes"
  - "Autosuggest omite el segmento completo 'Tel:' cuando no hay número"
  - "Lista de espera nunca renderiza href=\"tel:null\""
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Consumo de formatTelefono/tieneTelefono desde @/lib/telefono en vez de || '-' inline"
    - "render: (value) => formatTelefono(value) como punto de extensión por columna en ColumnDef de TablaReporte, sin tocar el componente genérico"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx
    - frontend/src/components/live-turno/tabs/DatosPacienteTab.tsx
    - frontend/src/components/AutocompletePaciente.tsx
    - frontend/src/components/crm/ListaEsperaSheet.tsx
    - frontend/src/app/dashboard/reportes/financieros/cuentas/page.tsx
    - frontend/src/app/dashboard/reportes/operativos/ausentismo/page.tsx

key-decisions:
  - "En AutocompletePaciente se usó tieneTelefono (no formatTelefono) para decidir si se muestra el segmento entero '— Tel: ...', evitando imprimir 'Tel: -' en un subtítulo no accionable"
  - "En ListaEsperaSheet el <span> inerte sin teléfono usa formatTelefono(p.telefono) para mostrar '-' junto al ícono Phone en gris, conservando el mismo alto de fila que el <a> con teléfono"
  - "TablaReporte.tsx no se modificó; el placeholder se inyectó vía render por columna en las 3 columnas de teléfono de reportes"

patterns-established:
  - "Placeholder de teléfono ausente: siempre formatTelefono, nunca || '-' inline"
  - "Segmento suprimible en subtítulos no accionables: tieneTelefono como condición, sin mostrar el placeholder"

requirements-completed: [TEL-03]

duration: 25min
completed: 2026-08-21
---

# Phase 69 Plan 04: Consistencia de teléfono opcional en display Summary

**Los 5 sitios reales de display de teléfono (ficha, live-turno, autosuggest, lista de espera, 3 columnas de reportes) consumen el helper único `formatTelefono`/`tieneTelefono` del plan 01, sin lógica de placeholder duplicada.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Migrados los dos `|| "-"` inline (`PacienteDetails.tsx`, `DatosPacienteTab.tsx`) a `formatTelefono`, cerrando el caso de teléfono con sólo espacios que `||` crudo no cubría
- Autosuggest (`AutocompletePaciente.tsx`) omite el segmento entero `— Tel: ...` cuando no hay número, en vez de imprimir `Tel: null`
- Lista de espera (`ListaEsperaSheet.tsx`) nunca renderiza `href="tel:null"`: sin teléfono cae un `<span>` inerte con el mismo ícono `Phone` en gris
- Las 3 columnas de teléfono en reportes (cuentas por cobrar, morosidad, ausentismo) muestran `-` vía `render` por columna, sin tocar `TablaReporte.tsx`

## Task Commits

1. **Task 1: Migrar los dos `|| "-"` inline al helper** - `22a53ad` (fix)
2. **Task 2: Autosuggest sin segmento de teléfono y lista de espera sin link `tel:` roto** - `f7923d1` (fix)
3. **Task 3: Placeholder en las 3 columnas de teléfono de reportes** - `eb7b2e1` (fix)

## Files Created/Modified
- `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` - `paciente.telefono || "-"` → `formatTelefono(paciente.telefono)`
- `frontend/src/components/live-turno/tabs/DatosPacienteTab.tsx` - ídem; `telefonoAlternativo` quedó intacto
- `frontend/src/components/AutocompletePaciente.tsx` - segmento `— Tel: {telefono}` condicionado con `tieneTelefono`
- `frontend/src/components/crm/ListaEsperaSheet.tsx` - `<a href="tel:...">` sólo con teléfono; sin teléfono, `<span>` inerte con `formatTelefono`
- `frontend/src/app/dashboard/reportes/financieros/cuentas/page.tsx` - `render: formatTelefono` en columnas de teléfono de cuentas por cobrar y morosidad
- `frontend/src/app/dashboard/reportes/operativos/ausentismo/page.tsx` - `render: formatTelefono` en columna de teléfono

## Decisions Made
- Ver `key-decisions` en frontmatter: `tieneTelefono` sin placeholder en el subtítulo del autosuggest; `TablaReporte.tsx` sin modificar, extensión vía `render` por columna.

## Deviations from Plan

None - plan ejecutado tal como fue escrito. Único detalle de verificación: el grep literal `git diff ... | grep '^[+-]' | grep -c 'header:'` de la criterio de aceptación de Task 3 cuenta las líneas `header:` reformateadas a multi-línea (mismo texto, quitada y re-agregada) al insertar `render:` junto a `key`/`header` existentes; verificado semánticamente que los valores de `header:` añadidos y quitados son idénticos (`"Teléfono"` en ambos casos) — no se agregó ni quitó ninguna columna real.

## Issues Encountered
El primer intento de esta sesión de generar el SUMMARY fue interrumpido por el stall watchdog (600s) tras completar y commitear las 3 tareas; este SUMMARY se escribe en la sesión de continuación sin re-ejecutar código, typecheck ni tests, reconstruyendo el contenido a partir de los 3 commits ya presentes (`22a53ad`, `f7923d1`, `eb7b2e1`).

## Next Phase Readiness
Los 5 sitios de display de teléfono quedan consistentes vía el helper único. Los planes 05/06 (controles de WhatsApp) pueden apoyarse en `getMotivoBloqueoWhatsApp` del plan 01 sin depender de este plan.

---
*Phase: 69-consistencia-de-tel-fono-opcional-frontend*
*Completed: 2026-08-21*
