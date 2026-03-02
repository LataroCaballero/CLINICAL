---
phase: 05-dashboard-de-conversion
verified: 2026-03-02T00:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Verificar visualmente que el embudo se muestra como trapecio vertical con barras decrecientes"
    expected: "Las barras van de más ancha (arriba, más pacientes) a más angosta (abajo, menos pacientes). La última barra es verde, las demás azules con opacidad decreciente."
    why_human: "El ancho de cada barra es calculado dinámicamente por CSS (width %) — no se puede verificar la apariencia visual programáticamente."
  - test: "Verificar que las tasas de paso entre etapas muestran '—' cuando no hay datos"
    expected: "Entre cada par de etapas aparece '↓ 67%' con datos reales, o '↓ —' cuando la etapa superior tiene 0 pacientes (denominador cero)."
    why_human: "Requiere datos de producción o fixtures para verificar el render condicional en runtime."
  - test: "Verificar que PipelineIncomeWidget y CoordinatorPerformanceWidget no son visibles para SECRETARIA"
    expected: "Al loguearse como SECRETARIA, esos dos widgets retornan null y no se renderizan en el DOM."
    why_human: "Requiere login con un usuario de rol SECRETARIA en el entorno de desarrollo."
  - test: "Verificar que el período seleccionado persiste al recargar la página"
    expected: "Si se cambia el período de un widget a 'Esta semana' y se recarga, el widget arranca con 'Esta semana' seleccionado (no vuelve al default)."
    why_human: "Requiere interacción en el browser para verificar localStorage."
  - test: "Verificar que el endpoint GET /reportes/crm original sigue funcionando"
    expected: "GET /reportes/crm?profesionalId=xxx retorna métricas del mes igual que antes del Phase 5."
    why_human: "Requiere el servidor corriendo para hacer la llamada HTTP y verificar la respuesta."
---

# Phase 5: Dashboard de Conversión — Verification Report

**Phase Goal:** Dashboard de conversión completo con embudo, KPIs por período, motivos de pérdida, pipeline financiero y performance del coordinador.
**Verified:** 2026-03-02
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /reportes/crm/funnel devuelve etapas con conteos y tasas de paso (null cuando denominador = 0) | ✓ VERIFIED | `crm-dashboard.service.ts` L71–78: `etapas[i].count === 0 ? null : Math.round(...)` — implementación completa con 5 etapas del funnel |
| 2 | GET /reportes/crm/kpis devuelve nuevos, confirmados, totalActivos, tasaConversion | ✓ VERIFIED | `crm-dashboard.service.ts` L108–145: 3 queries en Promise.all, fórmula `Math.round((confirmados / totalActivos) * 1000) / 10` |
| 3 | GET /reportes/crm/motivos-perdida devuelve total + array con porcentajes | ✓ VERIFIED | `crm-dashboard.service.ts` L147–172: groupBy motivoPerdida con cálculo de porcentaje por motivo |
| 4 | GET /reportes/crm/pipeline-income suma solo presupuestos ENVIADOS de pacientes CALIENTES | ✓ VERIFIED | `crm-dashboard.service.ts` L174–193: `estado: EstadoPresupuesto.ENVIADO, paciente: { temperatura: TemperaturaPaciente.CALIENTE }` |
| 5 | GET /reportes/crm/coordinator-performance devuelve coordinadores con nombre, interacciones, pacientesContactados, porcentajeConversion | ✓ VERIFIED | `crm-dashboard.service.ts` L195–251: agrupa por `registradoPorId`, `Set<string>` para pacientes únicos, `null` si pacientesContactados === 0 |
| 6 | El endpoint /reportes/crm original sigue funcionando | ✓ VERIFIED | `reportes.controller.ts` L73–79: endpoint `@Get('crm')` intacto, usa `crmMetricsService` sin cambios |
| 7 | usePeriodoFilter persiste en localStorage y restaura al montar | ✓ VERIFIED | `usePeriodoFilter.ts` L6–12: lazy init con `typeof window === 'undefined'` guard; `useEffect` L14–16 persiste en localStorage |
| 8 | PeriodoSelector renderiza 3 botones y resalta el activo | ✓ VERIFIED | `PeriodoSelector.tsx` L16–35: 3 opciones mapeadas, clase condicional `bg-blue-50 text-blue-700` para activo |
| 9 | Todos los widgets del dashboard están integrados y visibles | ✓ VERIFIED | `dashboard/page.tsx` L111–120: CRMFunnelWidget, LossReasonsWidget, PipelineIncomeWidget, CoordinatorPerformanceWidget todos renderizados |
| 10 | PipelineIncomeWidget y CoordinatorPerformanceWidget retornan null para roles no autorizados | ✓ VERIFIED | Ambos archivos línea 19/28: `if (user && user.rol !== 'PROFESIONAL' && user.rol !== 'ADMIN') return null` |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `backend/src/prisma/schema.prisma` — campo `registradoPorId` | ✓ VERIFIED | L1045–1046: `registradoPorId String?` con relación `ContactoLogRegistradoPor` hacia `Usuario`; relación inversa en `Usuario` L41 |
| `backend/src/prisma/migrations/20260302000000_contactolog_registrado_por/migration.sql` | ✓ VERIFIED | Directorio y archivo `migration.sql` existen |
| `backend/src/modules/reportes/services/crm-dashboard.service.ts` | ✓ VERIFIED | 253 líneas, 5 métodos públicos: `getFunnelSnapshot`, `getKpis`, `getMotivosPerdida`, `getPipelineIncome`, `getCoordinatorPerformance` + método privado `calcularRango` |
| `backend/src/modules/reportes/reportes.controller.ts` | ✓ VERIFIED | 5 endpoints bajo `crm/*` en L81–116; `crmDashboardService` inyectado en constructor L51 |
| `backend/src/modules/reportes/reportes.module.ts` | ✓ VERIFIED | `CrmDashboardService` en `providers` L28 y `exports` L38 |
| `frontend/src/hooks/usePeriodoFilter.ts` | ✓ VERIFIED | Exporta `Periodo` type y `usePeriodoFilter` function, 19 líneas |
| `frontend/src/components/crm/PeriodoSelector.tsx` | ✓ VERIFIED | Exporta `PeriodoSelector`, importa `Periodo` desde `usePeriodoFilter`, 3 botones con `type="button"` |
| `frontend/src/hooks/useCRMFunnel.ts` | ✓ VERIFIED | Llama `GET /reportes/crm/funnel`, `enabled: !!profesionalId` |
| `frontend/src/hooks/useCRMKpis.ts` | ✓ VERIFIED | Llama `GET /reportes/crm/kpis`, acepta `periodo` en queryKey y en params |
| `frontend/src/hooks/useCRMLossReasons.ts` | ✓ VERIFIED | Llama `GET /reportes/crm/motivos-perdida` |
| `frontend/src/hooks/useCRMPipelineIncome.ts` | ✓ VERIFIED | Llama `GET /reportes/crm/pipeline-income` |
| `frontend/src/hooks/useCoordinatorPerformance.ts` | ✓ VERIFIED | Llama `GET /reportes/crm/coordinator-performance`, exporta `CoordinadorRow` y `CoordinatorPerformanceData` |
| `frontend/src/app/dashboard/components/CRMFunnelWidget.tsx` | ✓ VERIFIED | 110 líneas, trapecio via `width: ${widthPct}%`, tarjeta perdidos separada a la derecha |
| `frontend/src/app/dashboard/components/CRMKpiCards.tsx` | ✓ VERIFIED | Acepta `periodo: Periodo` como prop, usa `useCRMKpis`, 4 KpiCards |
| `frontend/src/app/dashboard/components/LossReasonsWidget.tsx` | ✓ VERIFIED | 73 líneas, usa `useCRMLossReasons` + `usePeriodoFilter` + `PeriodoSelector` |
| `frontend/src/app/dashboard/components/PipelineIncomeWidget.tsx` | ✓ VERIFIED | 52 líneas, rol guard `PROFESIONAL/ADMIN`, storage key propia |
| `frontend/src/app/dashboard/components/CoordinatorPerformanceWidget.tsx` | ✓ VERIFIED | 79 líneas, `<table>` con 4 columnas: Nombre / Interacciones / Pacientes contactados / % Conversión |
| `frontend/src/app/dashboard/page.tsx` | ✓ VERIFIED | Importa y renderiza todos los widgets nuevos; `kpiPeriodo` state + `PeriodoSelector` encima del grid de KPIs |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `reportes.controller.ts` | `crm-dashboard.service.ts` | constructor injection `crmDashboardService` | ✓ WIRED | L51 constructor + L83/91/99/107/115 llamadas |
| `crm-dashboard.service.ts` | `prisma.paciente` | `groupBy` + `count` queries | ✓ WIRED | L51, L85, L112, L118, L125, L150 |
| `crm-dashboard.service.ts` | `prisma.presupuesto` | `findMany` con filtro | ✓ WIRED | L177: `this.prisma.presupuesto.findMany(...)` |
| `CRMFunnelWidget.tsx` | `useCRMFunnel.ts` | import + `const { data, isLoading } = useCRMFunnel(profId)` | ✓ WIRED | L2 import + L27 uso + L42+ render de `data.etapas` |
| `CRMKpiCards.tsx` | `useCRMKpis.ts` | import + `useCRMKpis(profId, periodo)` | ✓ WIRED | L3 import + L14 uso + L20+ render de `data.nuevos` etc. |
| `CoordinatorPerformanceWidget.tsx` | `useCurrentUser.ts` | import + rol check | ✓ WIRED | L7 import + L10 uso + L19 condicional `user.rol` |
| `dashboard/page.tsx` | `LossReasonsWidget.tsx` | import + render | ✓ WIRED | L13 import + L115 render |
| `PeriodoSelector.tsx` | `usePeriodoFilter.ts` | import `Periodo` type | ✓ WIRED | L3: `import { Periodo } from '@/hooks/usePeriodoFilter'` |
| `useCRMFunnel.ts` | `/reportes/crm/funnel` | `api.get` con query params | ✓ WIRED | `api.get('/reportes/crm/funnel', { params: { profesionalId } })` |
| `useCoordinatorPerformance.ts` | `/reportes/crm/coordinator-performance` | `api.get` con query params | ✓ WIRED | `api.get('/reportes/crm/coordinator-performance', { params })` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DASH-01 | 05-01, 05-02, 05-03 | El profesional ve el embudo de conversión con cantidad de pacientes por etapa CRM y tasa de paso entre etapas | ✓ SATISFIED | `getFunnelSnapshot` + `CRMFunnelWidget` con `tasasPaso` renderizados entre etapas |
| DASH-02 | 05-01, 05-02, 05-03 | El profesional ve el ingreso potencial del pipeline (suma de presupuestos activos por etapa) | ✓ SATISFIED | `getPipelineIncome` filtra ENVIADO + CALIENTE; `PipelineIncomeWidget` renderiza total formateado |
| DASH-03 | 05-01, 05-02, 05-03 | El profesional ve los principales motivos de pérdida de pacientes con porcentajes | ✓ SATISFIED | `getMotivosPerdida` + `LossReasonsWidget` con barras de porcentaje |
| DASH-04 | 05-01, 05-02, 05-03 | El profesional ve métricas del período: nuevos pacientes, cirugías cerradas, tasa de conversión general | ✓ SATISFIED | `getKpis` + `CRMKpiCards` con 4 tarjetas (nuevos, confirmados, tasa, activos) + `PeriodoSelector` |
| DASH-05 | 05-01, 05-02, 05-03 | El coordinador ve su performance de seguimiento: interacciones registradas, pacientes contactados esta semana | ✓ SATISFIED | `getCoordinatorPerformance` + `CoordinatorPerformanceWidget` tabla con 4 columnas, default período = semana |

**Orphaned requirements:** Ninguno. Los 5 IDs DASH-01 a DASH-05 están cubiertos en los 3 planes y tienen implementación verificada.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `PipelineIncomeWidget.tsx` | 25–27 | `TODO: tier gating` comentario | ℹ️ Info | Deferral documentado explícitamente (mencionado en 05-CONTEXT.md como fuera de scope). No bloquea funcionalidad actual. |

No se encontraron stubs, implementaciones vacías, ni placeholders en ningún archivo del phase.

---

### Human Verification Required

#### 1. Apariencia visual del embudo trapecio

**Test:** Abrir `http://localhost:3000/dashboard` como PROFESIONAL o ADMIN con datos de pacientes en distintas etapas CRM. Observar el widget "Embudo de conversión".
**Expected:** Las barras deben ser más anchas arriba (etapa NUEVO_LEAD con más pacientes) y progresivamente más angostas hacia abajo (CONFIRMADO). La última barra debe ser verde (`#10b981`), las anteriores azules con opacidad decreciente.
**Why human:** El ancho de cada barra es calculado vía CSS inline `width: ${widthPct}%` donde `widthPct = Math.round((etapa.count / maxCount) * 100)`. El efecto trapecio solo se puede confirmar visualmente con datos reales.

#### 2. Tasas de paso muestran "—" cuando denominador es cero

**Test:** Si una etapa superior tiene 0 pacientes, la tasa de paso entre esa etapa y la siguiente debe mostrar `↓ —` en lugar de un número.
**Expected:** Texto `↓ —` entre etapas donde no hay pacientes en la etapa superior.
**Why human:** Requiere un estado de datos específico (0 pacientes en alguna etapa intermedia) para triggear el branch `tasa: null` del backend.

#### 3. Visibilidad por rol de PipelineIncomeWidget y CoordinatorPerformanceWidget

**Test:** Iniciar sesión con un usuario de rol SECRETARIA. Ir a `/dashboard`.
**Expected:** Los widgets "Pipeline potencial" y "Performance de seguimiento" no aparecen en el DOM.
**Why human:** Requiere autenticación con un rol diferente en el entorno de desarrollo.

#### 4. Persistencia de período en localStorage

**Test:** Cambiar el período del widget "Motivos de pérdida" a "Esta semana". Recargar la página.
**Expected:** El widget arranca con "Esta semana" seleccionado, no con el default "Este mes".
**Why human:** Requiere interacción con el browser y verificación de localStorage.

#### 5. Endpoint /reportes/crm original intacto

**Test:** Hacer `GET /reportes/crm?profesionalId=<id>` al backend corriendo.
**Expected:** La respuesta es idéntica a la que retornaba antes del Phase 5 (usa `CrmMetricsService`, no el nuevo `CrmDashboardService`).
**Why human:** Requiere servidor corriendo y una llamada HTTP real.

---

### Gaps Summary

No hay gaps. Todos los must-haves están completamente implementados y conectados:

- **Backend:** `CrmDashboardService` con 5 métodos reales (no stubs), todos con queries Prisma a `paciente`, `presupuesto` y `contactoLog`. El controlador expone 5 endpoints bajo `crm/*` sin romper el `crm` original. El módulo registra el servicio correctamente.
- **Schema:** `registradoPorId String?` agregado a `ContactoLog` con relación bidireccional a `Usuario`. Migración SQL manual creada.
- **Frontend hooks:** 7 archivos nuevos (`usePeriodoFilter`, `PeriodoSelector`, más 5 hooks TanStack Query) con `enabled: !!profesionalId`, queryKeys diferenciados por período, tipos TypeScript correctos.
- **Widgets:** 5 componentes (2 reescritos + 3 nuevos) implementados con lógica real — no placeholders. Cada uno importa su hook correspondiente y renderiza los datos.
- **Dashboard integration:** `page.tsx` importa y renderiza todos los widgets nuevos en el layout correcto. `PeriodoSelector` está encima del grid de KPIs, no dentro de ningún `KpiCard`.
- **Role gating:** `PipelineIncomeWidget` y `CoordinatorPerformanceWidget` retornan `null` para roles distintos de PROFESIONAL y ADMIN.

El único item pendiente es la verificación humana de la apariencia visual y comportamiento runtime (localStorage, role gating en el browser).

---

_Verified: 2026-03-02_
_Verifier: Claude (gsd-verifier)_
