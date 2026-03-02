# Phase 5: Dashboard de Conversion - Research

**Researched:** 2026-03-02
**Domain:** NestJS metrics endpoints + Next.js dashboard widgets (CRM analytics, funnel visualization, role-based visibility)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visualización del embudo**
- Trapecio clásico (funnel): barras decrecientes de arriba a abajo, cada etapa con conteo de pacientes
- Tasa de paso aparece ENTRE cada par de etapas (↓ 67% entre CONTACTADO y CONSULTA, etc.)
- El embudo termina en CIRUGIA (conversión exitosa) — los perdidos NO forman parte del flujo del embudo
- Los perdidos se muestran en una tarjeta separada al lado del embudo (total + info de motivos)
- El embudo es un snapshot actual (cuántos pacientes hay HOY en cada etapa), no muestra evolución del período

**Filtro de período**
- Opciones fijas: Esta semana / Este mes / Este trimestre
- Período por defecto al abrir: Este mes
- Cada widget tiene su propio filtro independiente (no hay filtro global)
- La selección de período por widget persiste en localStorage entre sesiones

**Ingreso potencial del pipeline**
- Se muestra como un único número total (sin desglose por etapa)
- Solo cuenta presupuestos en estado "enviado" con paciente en temperatura CALIENTE
- Tiene su propio filtro de período independiente (semana/mes/trimestre)
- Visibilidad por tier: el widget solo se muestra en tiers con acceso a datos financieros. En el tier básico, el espacio desaparece y el layout se comprime (sin upgrade prompt)

**Performance del coordinador (SECRETARIA)**
- Visible únicamente para roles PROFESIONAL y ADMIN (vista gerencial, la SECRETARIA no la ve)
- Tabla con columnas: Nombre | Interacciones registradas | Pacientes contactados | % Conversión personal
- % Conversión = qué porcentaje de pacientes contactados avanzaron de etapa CRM
- Tiene su propio filtro de período independiente (semana/mes/trimestre), default esta semana

### Claude's Discretion
- Diseño específico de la tarjeta de "perdidos" (layout interno, qué información muestra)
- Manejo de estados vacíos en cada widget (sin datos para el período)
- Skeleton/loading states
- Orden y disposición exacta de los widgets en el dashboard

### Deferred Ideas (OUT OF SCOPE)
- Desglose del ingreso potencial por etapa CRM — posible mejora futura del widget financiero
- Vista de performance para la SECRETARIA (que vea sus propios datos) — futura fase de mejora de UX por rol
- Upgrade prompt para tier básico — decisión de producto para cuando se defina la estrategia de monetización
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | El profesional ve el embudo de conversión con cantidad de pacientes por etapa CRM y tasa de paso entre etapas | Backend: nuevo endpoint `/reportes/crm/funnel` que devuelve snapshot de conteos por EtapaCRM + tasas de paso calculadas. Frontend: componente `ConversionFunnelWidget` con trapecio visual SVG/CSS puro |
| DASH-02 | El profesional ve el ingreso potencial del pipeline (suma de presupuestos activos por etapa) | Backend: extender `/reportes/crm/pipeline-income` filtrando `Presupuesto.estado = ENVIADO` AND `Paciente.temperatura = CALIENTE` dentro del período. Frontend: `PipelineIncomeWidget` con filtro propio, condicional por tier |
| DASH-03 | El profesional ve los principales motivos de pérdida de pacientes con porcentajes | Backend: agregar `/reportes/crm/motivos-perdida` — `GROUP BY Paciente.motivoPerdida` donde `etapaCRM = PERDIDO` en el período. Frontend: `LossReasonsWidget` con distribución de barras o lista rankeada |
| DASH-04 | El profesional ve métricas del período: nuevos pacientes, cirugías cerradas y tasa de conversión general | Backend: `/reportes/crm/kpis` — nuevos pacientes (`createdAt` en rango), confirmados (`etapaCRM = CONFIRMADO` en rango), tasa = confirmados/leads. Frontend: reemplazar/ampliar `CRMKpiCards` existente con filtro de período |
| DASH-05 | El coordinador ve su performance de seguimiento: interacciones registradas y pacientes contactados en la semana | Backend: `/reportes/crm/coordinator-performance` — `GROUP BY ContactoLog.profesionalId` en período, calcular pacientes únicos contactados + avances de etapa. Frontend: `CoordinatorPerformanceWidget` tabla con datos agregados por secretaria, visible solo para PROFESIONAL/ADMIN |
</phase_requirements>

---

## Summary

Phase 5 construye sobre una base sólida ya existente. El proyecto tiene: el servicio `CrmMetricsService` en `/reportes/crm`, el hook `useCRMMetrics`, los componentes `CRMKpiCards` y `CRMFunnelWidget` en el dashboard. Sin embargo, lo que existe es una versión simplificada: el embudo actual es horizontal con flechas simples (no trapecio), los datos son estáticos del mes sin filtro de período, y no existen los widgets de motivos de pérdida ni performance de coordinador.

El trabajo es fundamentalmente **ampliar y reemplazar** lo existente, no construir desde cero. La estrategia correcta es: (1) extender `CrmMetricsService` o crear sub-servicios específicos en el módulo `reportes`, (2) agregar nuevos endpoints en `ReportesController`, (3) crear nuevos componentes de dashboard que reemplazarán a `CRMFunnelWidget` y `CRMKpiCards`, y (4) persistir el estado de filtros de período en localStorage por widget.

El aspecto más delicado de la implementación es la **lógica del embudo snapshot**: los conteos de etapas son el estado ACTUAL de los pacientes (no histórico del período), mientras que las métricas KPIs (nuevos pacientes, cirugías cerradas, tasa de conversión) sí son del período seleccionado. Esta distinción debe quedar clara en los endpoints y la UI para no confundir al usuario.

**Primary recommendation:** Usar el patrón existente de `CrmMetricsService` — agregar métodos específicos al servicio o crear un servicio separado `CrmDashboardService`, luego agregar endpoints bajo `/reportes/crm/*`. En el frontend, crear componentes en `frontend/src/app/dashboard/components/` siguiendo el patrón de `CRMKpiCards.tsx` y `CRMFunnelWidget.tsx`.

---

## Standard Stack

### Core (ya en el proyecto — sin instalaciones nuevas necesarias)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS + Prisma | ya instalado | Backend endpoints + DB queries | Patrón del proyecto |
| TanStack Query | ya instalado | Data fetching con cache, staleTime | Patrón de todos los hooks del proyecto |
| Tailwind CSS | ya instalado | Estilos de widgets | Patrón de toda la UI |
| shadcn/ui | ya instalado | Skeleton, Table, Badge | Componentes base del proyecto |
| Zustand | ya instalado | State management (professional context) | Patrón del proyecto |
| lucide-react | ya instalado | Iconos (TrendingUp, Users, etc.) | Ya usado en CRMMetricsBar |

### Para el embudo trapecio — SVG/CSS puro (sin librería nueva)
El embudo trapecio clásico de CRM se implementa con CSS puro usando `clip-path` o SVG inline. No requiere librería de gráficos. Rechazado Recharts/Chart.js por overhead y porque el diseño pedido es trapecio custom, no chart genérico.

**Alternativa considerada y descartada:** Recharts — overhead excesivo para lo que son rectángulos con clip-path, introduce dependencia nueva sin necesidad.

### Para persistencia de filtros en localStorage
Patrón del proyecto: usar un hook custom con `useState` + `useEffect` que lee/escribe a `localStorage`. No requiere librería. El proyecto ya tiene Zustand con persistencia en `frontend/src/store/` pero para este caso un hook local por widget es más limpio que un store global de preferencias de dashboard.

**Instalación:** Ninguna. Todo el stack necesario ya está presente.

---

## Architecture Patterns

### Recommended Backend Structure
```
backend/src/modules/reportes/
├── services/
│   ├── crm-metrics.service.ts     ← EXISTENTE: ampliar con nuevos métodos
│   └── crm-dashboard.service.ts   ← NUEVO: lógica de funnel, motivos, performance
├── dto/
│   └── crm-dashboard.dto.ts       ← NUEVO: DTOs de query params con período
└── reportes.controller.ts         ← EXISTENTE: agregar endpoints /crm/*
```

### Recommended Frontend Structure
```
frontend/src/
├── hooks/
│   ├── useCRMMetrics.ts           ← EXISTENTE: mantener para compatibilidad
│   ├── useCRMFunnel.ts            ← NUEVO: snapshot de etapas
│   ├── useCRMKpis.ts              ← NUEVO: métricas del período con filtro
│   ├── useCRMLossReasons.ts       ← NUEVO: motivos de pérdida con filtro
│   ├── useCRMPipelineIncome.ts    ← NUEVO: ingreso potencial con filtro
│   └── useCoordinatorPerformance.ts ← NUEVO: performance de secretarias
├── app/dashboard/components/
│   ├── CRMKpiCards.tsx            ← EXISTENTE: reemplazar con filtro de período
│   ├── CRMFunnelWidget.tsx        ← EXISTENTE: reemplazar con trapecio visual
│   ├── CRMLossReasonsWidget.tsx   ← NUEVO
│   ├── CRMPipelineIncomeWidget.tsx ← NUEVO
│   └── CoordinatorPerformanceWidget.tsx ← NUEVO
```

### Pattern 1: Período como query param estándar
Todos los nuevos endpoints reciben `periodo: 'semana' | 'mes' | 'trimestre'` como query param. El backend calcula el rango de fechas (`inicio`/`fin`) internamente basado en el valor del período. Esto evita que el frontend haga cálculos de fechas.

```typescript
// DTO de período (reutilizable en múltiples endpoints)
export class CrmPeriodoDto {
  @IsOptional()
  @IsEnum(['semana', 'mes', 'trimestre'])
  periodo?: 'semana' | 'mes' | 'trimestre' = 'mes';

  @IsString()
  profesionalId: string;
}

// Helper en el servicio
private calcularRango(periodo: string): { inicio: Date; fin: Date } {
  const now = new Date();
  switch (periodo) {
    case 'semana':
      // Lunes de esta semana → domingo
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const inicio = new Date(now.setDate(diff));
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      fin.setHours(23, 59, 59, 999);
      return { inicio, fin };
    case 'trimestre':
      const trimestre = Math.floor(now.getMonth() / 3);
      return {
        inicio: new Date(now.getFullYear(), trimestre * 3, 1),
        fin: new Date(now.getFullYear(), trimestre * 3 + 3, 0, 23, 59, 59, 999),
      };
    default: // 'mes'
      return {
        inicio: new Date(now.getFullYear(), now.getMonth(), 1),
        fin: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
  }
}
```

### Pattern 2: Filtro de período persistido en localStorage por widget
Hook custom reutilizable para persistencia de filtro de período:

```typescript
// frontend/src/hooks/usePeriodoFilter.ts
import { useState, useEffect } from 'react';

export type Periodo = 'semana' | 'mes' | 'trimestre';

export function usePeriodoFilter(storageKey: string, defaultPeriodo: Periodo = 'mes') {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    if (typeof window === 'undefined') return defaultPeriodo;
    return (localStorage.getItem(storageKey) as Periodo) ?? defaultPeriodo;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, periodo);
  }, [storageKey, periodo]);

  return [periodo, setPeriodo] as const;
}
```

Cada widget usa su propia key: `'crm-funnel-periodo'`, `'crm-pipeline-periodo'`, etc.

### Pattern 3: Embudo trapecio con CSS clip-path
El trapecio clásico se logra con barras de anchura decreciente, usando `style={{ width: '${pct}%' }}` donde `pct` = porcentaje relativo a la etapa máxima. Las tasas de paso se muestran como texto entre barras.

```tsx
// Lógica de cálculo de tasas de paso
const ETAPAS_FUNNEL = [
  { key: 'NUEVO_LEAD', label: 'Nuevo lead' },
  { key: 'TURNO_AGENDADO', label: 'Turno agendado' },
  { key: 'CONSULTADO', label: 'Consultado' },
  { key: 'PRESUPUESTO_ENVIADO', label: 'Presupuesto enviado' },
  { key: 'CONFIRMADO', label: 'Confirmado' },
] as const;

// Tasa de paso entre etapa i y etapa i+1:
// rate = etapas[i+1].count / etapas[i].count * 100
// Si etapas[i].count === 0 → 'N/A'
```

### Pattern 4: Visibilidad por rol (Performance del Coordinador)
La visibilidad del widget `CoordinatorPerformanceWidget` se controla en el frontend con `useCurrentUser()`:

```tsx
const { data: user } = useCurrentUser();
const canSeeCoordinatorPerf = user?.rol === 'PROFESIONAL' || user?.rol === 'ADMIN';

// En el render:
{canSeeCoordinatorPerf && <CoordinatorPerformanceWidget />}
```

El backend también valida roles en el controlador pero la restricción de visibilidad en UI es suficiente para UX correcta.

### Pattern 5: Endpoint de performance de coordinador
La query agrupa `ContactoLog` por `profesionalId` (que en este contexto es la SECRETARIA que registró el contacto, no el profesional del paciente). Esto requiere entender el campo: `ContactoLog.profesionalId` apunta a `Profesional`, pero las secretarias no tienen `Profesional` — registran contactos con `profesionalId` del profesional dueño del paciente.

**ALERTA:** Revisar el modelo `ContactoLog` — el campo `profesionalId` puede ser el profesional del paciente, no la secretaria. La secretaria se identifica por el `usuarioId` del que creó el contacto. Si `ContactoLog` no tiene campo `creadoPorId` o `usuarioId`, el performance de coordinador debe calcularse desde el `usuarioId` del JWT en el momento del registro. **Verificar el schema antes de implementar este endpoint.**

Verificación del schema (encontrado en la investigación):
```prisma
model ContactoLog {
  id                  String               @id @default(uuid())
  pacienteId          String
  profesionalId       String   // ← Este es el profesional del paciente, NO quien registró el contacto
  tipo                TipoContacto
  nota                String?
  fecha               DateTime             @default(now())
  etapaCRMPost        EtapaCRM?
  temperaturaPost     TemperaturaPaciente?
  proximaAccionFecha  DateTime?
  createdAt           DateTime             @default(now())
  paciente    Paciente    ...
  profesional Profesional ...
}
```

**Conclusión:** `ContactoLog` NO tiene campo para identificar quién (usuario/secretaria) registró el contacto. Para DASH-05, hay dos opciones:
1. Usar `profesionalId` del log como proxy (sirve para separar por clínica, no por secretaria individual)
2. Agregar campo `registradoPorId` a `ContactoLog` via migración

Para v1 DASH-05, la opción pragmática es: dado que una clínica típicamente tiene una sola secretaria por profesional, agrupar los ContactoLogs del período por paciente (count de pacientes únicos contactados) y total de interacciones, filtrado por `profesionalId` del paciente. La tabla de "performance" mostraría una fila por secretaria — pero sin campo de autoría en ContactoLog, no podemos distinguir qué secretaria hizo qué.

**Recomendación para DASH-05:** Implementar la vista de performance como "métricas de seguimiento de la clínica" (no por secretaria individual): total de interacciones del período y pacientes únicos contactados, sin breakdown por coordinador. La columna "Coordinador" se puede agregar en v2 cuando se agregue `registradoPorId` a `ContactoLog`. O agregar la migración ahora si el planner lo decide.

### Anti-Patterns to Avoid
- **Filtro global de período:** El usuario decidió filtros independientes por widget. No crear un FilterContext compartido.
- **Hardcodear fechas en el frontend:** El backend calcula rangos de fechas. El frontend solo envía `'semana' | 'mes' | 'trimestre'`.
- **Reutilizar el endpoint `/reportes/crm` existente para todo:** Ese endpoint tiene lógica de `mes` (formato `YYYY-MM`), no de período semana/trimestre. Crear endpoints nuevos específicos.
- **Chart.js o Recharts para el embudo:** El trapecio es CSS/SVG puro. No agregar dependencias de charting.
- **Modificar `CRMFunnelWidget.tsx` in-place:** El componente existente se puede reemplazar con una implementación nueva en el mismo archivo, o crear `ConversionFunnelWidget.tsx` nuevo y swapear en `page.tsx`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cálculo de inicio de semana | Lógica propia de días | Función utilitaria simple en el servicio | La semana argentina arranca el lunes, `getDay()=0` es domingo — hay un edge case simple que manejar |
| Skeleton loading states | Div placeholder custom | `<Skeleton>` de shadcn/ui | Ya importado en `CRMFunnelWidget.tsx` existente, consistente con el resto del dashboard |
| Formateo de moneda ARS | `toLocaleString` directo | `formatMoney()` ya definido en `CRMKpiCards.tsx` y `CRMMetricsBar.tsx` | Reutilizar función existente del proyecto |
| Persistencia de estado de UI | Zustand store nuevo | Hook `usePeriodoFilter` con localStorage | Más simple, aislado por widget, sin estado global innecesario |

---

## Common Pitfalls

### Pitfall 1: Snapshot vs. Período — confusión semántica
**What goes wrong:** El embudo muestra cuántos pacientes están HOY en cada etapa (snapshot). Los KPIs (nuevos pacientes, cirugías cerradas) usan el período seleccionado. Si se mezclan en el mismo endpoint, el dato del embudo cambia cuando el usuario cambia el filtro de período del widget de KPIs, lo cual es incorrecto.

**Why it happens:** La tentación de hacer un endpoint "todo en uno" que recibe `periodo` y devuelve todo.

**How to avoid:** Separar endpoints. El embudo (`/crm/funnel`) no acepta parámetro `periodo` — siempre es snapshot actual. Los KPIs (`/crm/kpis`) sí aceptan `periodo`.

**Warning signs:** Si el frontend pasa `periodo` al endpoint del embudo, algo está mal en el diseño.

### Pitfall 2: `profesionalId` en ContactoLog no es la secretaria
**What goes wrong:** Al calcular performance de coordinador agrupando por `ContactoLog.profesionalId`, se obtiene el profesional dueño del paciente, no quien registró el contacto.

**Why it happens:** El modelo `ContactoLog` fue diseñado para asociar el log al profesional del paciente (multi-tenant), no para auditar quién lo creó.

**How to avoid:** Para DASH-05 en v1, reportar métricas agregadas de seguimiento (totales de interacciones + pacientes únicos) en vez de breakdown por coordinador individual. O agregar `registradoPorId String?` con migración.

**Warning signs:** Query `GROUP BY profesionalId` en ContactoLog dará una sola fila por profesional, no múltiples filas por secretaria.

### Pitfall 3: Tasa de paso con denominador cero
**What goes wrong:** `tasa = etapa[i+1] / etapa[i] * 100` falla si `etapa[i] === 0`. JS devuelve `Infinity` o `NaN`.

**Why it happens:** Si la clínica es nueva y no tiene pacientes en alguna etapa, el denominador es cero.

**How to avoid:** En el cálculo de tasas: `etapa[i] === 0 ? null : Math.round((etapa[i+1] / etapa[i]) * 100)`. En el frontend, mostrar `—` cuando la tasa es `null`.

### Pitfall 4: Perdidos fuera del embudo pero dentro de los conteos
**What goes wrong:** `EtapaCRM.PERDIDO` existe en el enum. Si se cuenta en el total del embudo o en las tasas de paso, distorsiona los números.

**Why it happens:** Al hacer `SELECT etapaCRM, COUNT(*) FROM Paciente GROUP BY etapaCRM`, `PERDIDO` aparece como una etapa más.

**How to avoid:** El endpoint del embudo filtra `etapaCRM NOT IN ['PERDIDO', null]` para los datos del funnel. Los perdidos van a un campo separado `perdidos: { total, porMotivo: {...} }` en la respuesta.

### Pitfall 5: Widget financiero visible para roles sin acceso a datos financieros
**What goes wrong:** Si `CRMPipelineIncomeWidget` se renderiza para una SECRETARIA que no tiene acceso a financieros, se muestra un número de dinero que puede no deber ver.

**How to avoid:** La condición de visibilidad del widget financiero se basa en el tier/suscripción de la clínica, no en el rol. En ausencia de sistema de tiers implementado, tomar la decisión de mostrarlo a PROFESIONAL/ADMIN y ocultarlo a SECRETARIA/FACTURADOR, documentando que la lógica de tier se puede agregar después.

---

## Code Examples

### Backend: estructura del endpoint de funnel (snapshot)
```typescript
// GET /reportes/crm/funnel?profesionalId=xxx
@Get('crm/funnel')
getCRMFunnel(@Query('profesionalId') profesionalId: string) {
  return this.crmDashboardService.getFunnelSnapshot(profesionalId);
}

// En el servicio:
async getFunnelSnapshot(profesionalId: string) {
  const ETAPAS_FUNNEL = [
    EtapaCRM.NUEVO_LEAD,
    EtapaCRM.TURNO_AGENDADO,
    EtapaCRM.CONSULTADO,
    EtapaCRM.PRESUPUESTO_ENVIADO,
    EtapaCRM.CONFIRMADO,
  ];

  const counts = await this.prisma.paciente.groupBy({
    by: ['etapaCRM'],
    where: { profesionalId },
    _count: { id: true },
  });

  const perdidosCount = counts.find(r => r.etapaCRM === 'PERDIDO')?._count.id ?? 0;
  const motivosPerdida = await this.prisma.paciente.groupBy({
    by: ['motivoPerdida'],
    where: { profesionalId, etapaCRM: 'PERDIDO', motivoPerdida: { not: null } },
    _count: { id: true },
  });

  const etapaMap: Record<string, number> = {};
  for (const row of counts) {
    if (row.etapaCRM) etapaMap[row.etapaCRM] = row._count.id;
  }

  const etapas = ETAPAS_FUNNEL.map(etapa => ({
    etapa,
    count: etapaMap[etapa] ?? 0,
  }));

  // Calcular tasas de paso
  const tasasPaso = etapas.slice(0, -1).map((e, i) => ({
    de: e.etapa,
    a: etapas[i + 1].etapa,
    tasa: e.count === 0 ? null : Math.round((etapas[i + 1].count / e.count) * 100),
  }));

  return { etapas, tasasPaso, perdidos: { total: perdidosCount, porMotivo: motivosPerdida } };
}
```

### Backend: endpoint de KPIs del período
```typescript
// GET /reportes/crm/kpis?profesionalId=xxx&periodo=mes
@Get('crm/kpis')
getCRMKpis(
  @Query('profesionalId') profesionalId: string,
  @Query('periodo') periodo: 'semana' | 'mes' | 'trimestre' = 'mes',
) {
  return this.crmDashboardService.getKpis(profesionalId, periodo);
}

// En el servicio:
async getKpis(profesionalId: string, periodo: string) {
  const { inicio, fin } = this.calcularRango(periodo);

  const [nuevos, confirmados, totalActivos] = await Promise.all([
    this.prisma.paciente.count({
      where: { profesionalId, createdAt: { gte: inicio, lte: fin } },
    }),
    this.prisma.paciente.count({
      where: { profesionalId, etapaCRM: 'CONFIRMADO', updatedAt: { gte: inicio, lte: fin } },
    }),
    this.prisma.paciente.count({
      where: { profesionalId, etapaCRM: { not: 'PERDIDO' } },
    }),
  ]);

  const tasaConversion = totalActivos > 0
    ? Math.round((confirmados / totalActivos) * 1000) / 10
    : 0;

  return { periodo: { inicio, fin }, nuevos, confirmados, totalActivos, tasaConversion };
}
```

### Backend: endpoint de motivos de pérdida
```typescript
// GET /reportes/crm/motivos-perdida?profesionalId=xxx&periodo=mes
@Get('crm/motivos-perdida')
getMotivosPerdia(
  @Query('profesionalId') profesionalId: string,
  @Query('periodo') periodo: 'semana' | 'mes' | 'trimestre' = 'mes',
) {
  return this.crmDashboardService.getMotivosPerdida(profesionalId, periodo);
}

// En el servicio:
async getMotivosPerdida(profesionalId: string, periodo: string) {
  const { inicio, fin } = this.calcularRango(periodo);

  const grupos = await this.prisma.paciente.groupBy({
    by: ['motivoPerdida'],
    where: {
      profesionalId,
      etapaCRM: 'PERDIDO',
      updatedAt: { gte: inicio, lte: fin },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const total = grupos.reduce((acc, g) => acc + g._count.id, 0);

  return {
    total,
    motivos: grupos.map(g => ({
      motivo: g.motivoPerdida ?? 'SIN_MOTIVO',
      count: g._count.id,
      porcentaje: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
    })),
  };
}
```

### Backend: endpoint de ingreso potencial del pipeline
```typescript
// GET /reportes/crm/pipeline-income?profesionalId=xxx&periodo=mes
@Get('crm/pipeline-income')
getPipelineIncome(
  @Query('profesionalId') profesionalId: string,
  @Query('periodo') periodo: 'semana' | 'mes' | 'trimestre' = 'mes',
) {
  return this.crmDashboardService.getPipelineIncome(profesionalId, periodo);
}

// En el servicio — SOLO presupuestos ENVIADOS de pacientes CALIENTES:
async getPipelineIncome(profesionalId: string, periodo: string) {
  const { inicio, fin } = this.calcularRango(periodo);

  const presupuestos = await this.prisma.presupuesto.findMany({
    where: {
      profesionalId,
      estado: EstadoPresupuesto.ENVIADO,
      fechaEnviado: { gte: inicio, lte: fin },
      paciente: { temperatura: TemperaturaPaciente.CALIENTE },
    },
    select: { total: true },
  });

  const total = presupuestos.reduce((acc, p) => acc + Number(p.total), 0);
  return { total, count: presupuestos.length };
}
```

### Frontend: hook de filtro de período reutilizable
```typescript
// frontend/src/hooks/usePeriodoFilter.ts
import { useState, useEffect } from 'react';

export type Periodo = 'semana' | 'mes' | 'trimestre';

export function usePeriodoFilter(storageKey: string, defaultPeriodo: Periodo = 'mes') {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    if (typeof window === 'undefined') return defaultPeriodo;
    const stored = localStorage.getItem(storageKey);
    return (stored === 'semana' || stored === 'mes' || stored === 'trimestre')
      ? stored
      : defaultPeriodo;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, periodo);
  }, [storageKey, periodo]);

  return [periodo, setPeriodo] as const;
}
```

### Frontend: selector de período (componente UI compartido)
```tsx
// frontend/src/components/crm/PeriodoSelector.tsx
import { Periodo } from '@/hooks/usePeriodoFilter';

const OPCIONES: { value: Periodo; label: string }[] = [
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'trimestre', label: 'Este trimestre' },
];

interface Props {
  value: Periodo;
  onChange: (p: Periodo) => void;
}

export function PeriodoSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 text-xs">
      {OPCIONES.map(op => (
        <button
          key={op.value}
          onClick={() => onChange(op.value)}
          className={`px-2 py-1 rounded ${
            value === op.value
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}
```

### Frontend: visibilidad condicional por rol
```tsx
// Patrón para CoordinatorPerformanceWidget — invisible para SECRETARIA
const { data: user } = useCurrentUser();
if (user?.rol !== 'PROFESIONAL' && user?.rol !== 'ADMIN') return null;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `CRMFunnelWidget` — horizontal con flechas | Trapecio vertical clásico con tasas de paso | Phase 5 | Cambia completamente la visualización del embudo |
| `CrmMetricsService.getCRMMetrics` — endpoint único con `mes` (YYYY-MM) | Múltiples endpoints específicos con `periodo: 'semana'/'mes'/'trimestre'` | Phase 5 | Separación de concerns, compatibilidad con filtros independientes |
| Sin filtros de período en dashboard | Cada widget con filtro propio + localStorage | Phase 5 | Usuario controla contexto temporal por widget |
| Sin widget de motivos de pérdida | `LossReasonsWidget` en dashboard | Phase 5 | Cierra DASH-03 |
| Sin performance de coordinador | `CoordinatorPerformanceWidget` (métricas agregadas de seguimiento) | Phase 5 | Cierra DASH-05 con caveat de granularidad por secretaria |

**Deprecated/outdated:**
- `CRMFunnelWidget.tsx` actual: se reemplaza con nueva implementación de trapecio. Borrar o reescribir in-place.
- El parámetro `mes` (formato `YYYY-MM`) en `/reportes/crm`: mantener para compatibilidad con `useCRMMetrics` existente, pero los nuevos endpoints usan `periodo`.

---

## Open Questions

1. **¿Agregar `registradoPorId` a `ContactoLog` en Phase 5?**
   - What we know: `ContactoLog.profesionalId` es el profesional del paciente, no quien registró el contacto. Sin este campo, DASH-05 no puede hacer breakdown por coordinador individual.
   - What's unclear: Si el usuario considera suficiente mostrar métricas agregadas de la clínica (sin breakdown por secretaria), o si insiste en ver la tabla por nombre de coordinador.
   - Recommendation: Para v1, implementar DASH-05 como métricas agregadas (total interacciones + pacientes únicos contactados en el período, sin tabla por nombre). Si el usuario quiere la tabla con nombres de coordinadores, agregar la migración de `registradoPorId` es un trabajo adicional de ~30min.

2. **¿La lógica de "tier" para el widget financiero ya existe en el sistema?**
   - What we know: `ConfigClinica` existe pero no tiene campo de tier/suscripción. La decisión del CONTEXT.md dice "ocultar en tier básico sin upgrade prompt".
   - What's unclear: No hay sistema de tiers implementado en el proyecto. La decisión de cuándo mostrar el widget no tiene condición real que evaluar.
   - Recommendation: Mostrar el widget financiero para PROFESIONAL y ADMIN, ocultarlo para SECRETARIA (regla de rol razonable). Documentar que cuando se implemente el sistema de tiers, la condición se cambia por `clinica.tier === 'premium'`.

3. **¿Reemplazar `CRMFunnelWidget` y `CRMKpiCards` o crear componentes paralelos?**
   - What we know: Los componentes actuales están integrados en `dashboard/page.tsx`. El trapecio nuevo es completamente diferente visualmente.
   - Recommendation: Reemplazar in-place (mismo nombre de archivo, nueva implementación). Es más limpio que tener `CRMFunnelWidgetV2.tsx` y actualizar las importaciones.

---

## Inventory of What Already Exists (Phase 5 inherits)

### Backend — ya implementado
| Artifact | File | Relevance for Phase 5 |
|----------|------|----------------------|
| `CrmMetricsService` | `reportes/services/crm-metrics.service.ts` | Extender o usar como referencia de patrón |
| `GET /reportes/crm` | `reportes.controller.ts:71` | Endpoint base — mantener para compatibilidad |
| `ReportesModule` + `PrismaService` | `reportes.module.ts` | Registrar nuevo servicio aquí |
| Enums: `EtapaCRM`, `TemperaturaPaciente`, `MotivoPerdidaCRM` | `schema.prisma` | Usar directamente en queries |
| `ContactoLog` con `profesionalId` + `fecha` | `schema.prisma` | Query base para DASH-05 |
| `Presupuesto` con `estado`, `fechaEnviado`, `total` | `schema.prisma` | Query base para DASH-02 |

### Frontend — ya implementado
| Artifact | File | Relevance for Phase 5 |
|----------|------|----------------------|
| `useCRMMetrics` hook | `hooks/useCRMMetrics.ts` | Mantener, los 4 KPI cards lo usan |
| `CRMKpiCards` | `dashboard/components/CRMKpiCards.tsx` | Reemplazar con versión que tiene filtro de período |
| `CRMFunnelWidget` | `dashboard/components/CRMFunnelWidget.tsx` | Reemplazar con trapecio visual |
| `KpiCard` | `dashboard/components/KpiCard.tsx` | Reutilizar para nuevos KPIs |
| `useEffectiveProfessionalId` | `hooks/useEffectiveProfessionalId.ts` | Usar en todos los nuevos hooks |
| `useCurrentUser` | `hooks/useCurrentUser.ts` | Usar para visibilidad por rol |
| `formatMoney` (duplicado en CRMKpiCards + CRMMetricsBar) | - | Extraer a utilitario o copiar inline |
| `Skeleton` de shadcn/ui | ya importado | Usar en loading states |
| Dashboard `page.tsx` layout 12-col | `app/dashboard/page.tsx` | Insertar nuevos widgets en columna izquierda |

---

## Sources

### Primary (HIGH confidence)
- Codebase directo — `backend/src/prisma/schema.prisma` — modelos Paciente, Presupuesto, ContactoLog, enums EtapaCRM/TemperaturaPaciente/MotivoPerdidaCRM verificados
- Codebase directo — `backend/src/modules/reportes/services/crm-metrics.service.ts` — patrón de servicio, `prisma.paciente.groupBy` ya funciona
- Codebase directo — `frontend/src/app/dashboard/page.tsx` — layout del dashboard, punto de integración de nuevos widgets
- Codebase directo — `frontend/src/hooks/useCRMMetrics.ts` — patrón de hook existente a replicar
- Codebase directo — `.planning/phases/05-dashboard-de-conversion/05-CONTEXT.md` — decisiones bloqueantes del usuario

### Secondary (MEDIUM confidence)
- Patrón de `prisma.groupBy` verificado como ya usado en el proyecto (`crm-metrics.service.ts` línea 101-108)
- Patrón de `localStorage` para persistencia de UI sin Zustand — común en React, no requiere verificación externa

### Tertiary (LOW confidence — no aplica para este dominio)
N/A — todo el stack es interno al proyecto, no hay dependencias externas nuevas.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todo el stack ya está instalado y en uso, no hay librería nueva
- Architecture: HIGH — basado en inspección directa del código existente
- Pitfalls: HIGH — basados en inspección directa del schema Prisma y patrones de código existentes
- DASH-05 granularidad por coordinador: MEDIUM — la limitación del schema es real y verificada, la recomendación de mitigación es pragmática

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stack estable, no hay breaking changes esperados en NestJS/Prisma/Next.js en este período)
