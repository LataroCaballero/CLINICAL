---
phase: 05-dashboard-de-conversion
plan: "03"
subsystem: ui
tags: [react, next.js, tanstack-query, tailwind, crm, dashboard, widgets]

# Dependency graph
requires:
  - phase: 05-02
    provides: usePeriodoFilter, PeriodoSelector, useCRMFunnel, useCRMKpis, useCRMLossReasons, useCRMPipelineIncome, useCoordinatorPerformance

provides:
  - CRMFunnelWidget: trapecio vertical con tasas de paso entre etapas y tarjeta de perdidos lateral
  - CRMKpiCards: 4 KPI cards con filtro de periodo gestionado desde page.tsx
  - LossReasonsWidget: motivos de perdida con barras de porcentaje y PeriodoSelector propio
  - PipelineIncomeWidget: ingreso potencial del pipeline, visible solo PROFESIONAL/ADMIN
  - CoordinatorPerformanceWidget: tabla de performance de seguimiento, visible solo PROFESIONAL/ADMIN
  - dashboard/page.tsx actualizado con layout 12-col y todos los widgets CRM integrados

affects: [next-phases, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PeriodoSelector elevado a page.tsx para KPI cards — estado compartido sin prop drilling"
    - "Visibilidad por rol con useCurrentUser — return null para SECRETARIA/FACTURADOR en widgets gerenciales"
    - "Cada widget usa usePeriodoFilter con su propia storage key para persistencia independiente en localStorage"
    - "Trapecio vertical CRM: ancho proporcional al count, tasa de paso entre etapas interpolada entre barras"

key-files:
  created:
    - frontend/src/app/dashboard/components/LossReasonsWidget.tsx
    - frontend/src/app/dashboard/components/PipelineIncomeWidget.tsx
    - frontend/src/app/dashboard/components/CoordinatorPerformanceWidget.tsx
  modified:
    - frontend/src/app/dashboard/components/CRMFunnelWidget.tsx
    - frontend/src/app/dashboard/components/CRMKpiCards.tsx
    - frontend/src/app/dashboard/page.tsx

key-decisions:
  - "Estado de periodo de CRMKpiCards elevado a dashboard/page.tsx — permite PeriodoSelector externo al grid de 4 cards sin prop headerAction"
  - "CoordinatorPerformanceWidget y PipelineIncomeWidget retornan null para SECRETARIA via useCurrentUser rol check"
  - "Trapecio vertical usa width proporcional al maxCount (no fijo) — etapa con mas pacientes = 100%, resto decrece"
  - "Tarjeta de perdidos separada al lado derecho del embudo (w-40 shrink-0) — no integrada dentro del funnel"

patterns-established:
  - "Widget CRM con PeriodoSelector propio: usePeriodoFilter con storage key unica + PeriodoSelector en header del widget"
  - "Guard de rol en widget: useCurrentUser + early return null antes del isLoading check"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05]

# Metrics
duration: 15min
completed: 2026-03-02
---

# Phase 5 Plan 03: Dashboard de Conversion Summary

**5 widgets CRM integrados en dashboard — trapecio vertical con tasas de paso, KPIs por periodo, motivos de perdida, pipeline financiero y tabla de performance del coordinador, con persistencia de periodo en localStorage y visibilidad por rol**

## Performance

- **Duration:** ~15 min (tasks ejecutados en sesion anterior, checkpoint aprobado hoy)
- **Started:** 2026-03-02T15:19:00Z
- **Completed:** 2026-03-02T15:35:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 6

## Accomplishments

- CRMFunnelWidget reescrito como trapecio vertical clasico con barras decrecientes por etapa, tasas de paso interpoladas entre etapas, y tarjeta de perdidos separada a la derecha
- CRMKpiCards reescrito con prop `periodo` recibido desde page.tsx (estado elevado), permitiendo PeriodoSelector encima del grid de 4 KPI cards
- Tres widgets nuevos creados: LossReasonsWidget (barras de porcentaje con PeriodoSelector), PipelineIncomeWidget (ingreso potencial, rol-gated), CoordinatorPerformanceWidget (tabla Nombre/Interacciones/Pacientes/Conversion, rol-gated)
- dashboard/page.tsx integra todos los widgets en layout coherente; todos los widgets financieros y de turnos existentes preservados intactos
- Build de frontend pasa sin errores de TypeScript
- Checkpoint de verificacion visual aprobado por el usuario

## Task Commits

1. **Task 1: Reescribir CRMFunnelWidget + CRMKpiCards, crear LossReasonsWidget y PipelineIncomeWidget** - `bf29b50` (feat)
2. **Task 2: Crear CoordinatorPerformanceWidget e integrar todos los widgets en dashboard/page.tsx** - `aa095da` (feat)
3. **Task 3: Checkpoint — Verificacion visual aprobada** - (sin commit, aprobacion del usuario)

## Files Created/Modified

- `frontend/src/app/dashboard/components/CRMFunnelWidget.tsx` - Reescrito: trapecio vertical con barras proporcionales al maxCount, tasas de paso entre etapas, tarjeta de perdidos lateral (w-40 shrink-0)
- `frontend/src/app/dashboard/components/CRMKpiCards.tsx` - Reescrito: acepta prop `periodo: Periodo` desde page.tsx, usa useCRMKpis, 4 KPI cards (nuevos, confirmados, tasa conversion, activos)
- `frontend/src/app/dashboard/components/LossReasonsWidget.tsx` - Nuevo: motivos de perdida con barras de progreso y porcentajes, PeriodoSelector con localStorage key 'crm-loss-reasons-periodo'
- `frontend/src/app/dashboard/components/PipelineIncomeWidget.tsx` - Nuevo: ingreso potencial (presupuestos ENVIADO + pacientes CALIENTE), visible solo PROFESIONAL/ADMIN, PeriodoSelector con key 'crm-pipeline-income-periodo'
- `frontend/src/app/dashboard/components/CoordinatorPerformanceWidget.tsx` - Nuevo: tabla HTML con columnas Nombre | Interacciones registradas | Pacientes contactados | % Conversion, visible solo PROFESIONAL/ADMIN, PeriodoSelector con key 'coordinator-performance-periodo'
- `frontend/src/app/dashboard/page.tsx` - Actualizado: estado kpiPeriodo elevado al page, PeriodoSelector sobre grid de KPI cards, nuevos widgets integrados en layout, widgets existentes preservados

## Decisions Made

- Estado de periodo de CRMKpiCards elevado a dashboard/page.tsx para permitir PeriodoSelector fuera del grid de cards sin usar prop `headerAction` (que KpiCard no acepta)
- Guard de visibilidad por rol implementado con useCurrentUser().data.rol — check antes del isLoading guard, retorna null para roles no autorizados
- Trapecio vertical usa ancho proporcional al maxCount del conjunto de etapas — la etapa con mas pacientes toma 100%, el resto decrece; opacidad decrece con indice
- Tarjeta de perdidos como bloque separado (no dentro del funnel) — ancho fijo w-40 shrink-0 con background rojo suave

## Deviations from Plan

None — plan ejecutado exactamente como especificado. Los hooks referenciados (useCRMFunnel, useCRMKpis, useCRMLossReasons, useCRMPipelineIncome, useCoordinatorPerformance) ya existian desde el plan 05-02.

## Issues Encountered

None — el build paso limpio sin errores de TypeScript. El checkpoint de verificacion visual fue aprobado por el usuario sin observaciones de problemas.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 5 completa: todos los planes 05-01, 05-02, 05-03 ejecutados y verificados
- Dashboard de conversion funcional con embudo trapecio, KPIs por periodo, motivos de perdida, pipeline financiero y performance del coordinador
- Requirements DASH-01 a DASH-05 completados con cobertura visual en el dashboard
- No hay bloqueantes para fases futuras

---
*Phase: 05-dashboard-de-conversion*
*Completed: 2026-03-02*
