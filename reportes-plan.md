# Plan de Implementación - Módulo de Reportes y Analytics

## 1. Resumen de Requisitos

Basado en el documento de requisitos (`reportes.txt`):

### RF-020: Dashboard Principal
- KPIs del día (turnos, ingresos, ausentes)
- Gráficos de tendencias
- Próximos turnos
- Alertas y notificaciones pendientes

### RF-021: Reportes Operativos
- Reporte de turnos (diario, semanal, mensual)
- Tasa de ausentismo por paciente
- Ocupación por profesional
- Ranking de procedimientos
- Tiempos de espera promedio
- Tracking de venta de productos a pacientes (postventa)
- Feedback postventa
- Estrategia de fidelización

### RF-022: Reportes Financieros
- Ingresos por período
- Ingresos por profesional
- Ingresos por obra social
- Ingresos por prestación/prácticas
- Cuentas por cobrar
- Morosidad
- Pagos pendientes

### RF-023: Exportación de Reportes
- Exportar a JSON
- Exportar a CSV
- Exportar a PDF
- Envío programado por email

---

## 2. Arquitectura Propuesta

### 2.1 Estructura Backend

```
backend/src/modules/reportes/
├── reportes.module.ts
├── reportes.controller.ts
├── services/
│   ├── reportes-dashboard.service.ts    # KPIs y métricas del día
│   ├── reportes-operativos.service.ts   # Turnos, ausentismo, ocupación
│   ├── reportes-financieros.service.ts  # Ingresos, morosidad, cuentas
│   └── reportes-export.service.ts       # Exportación JSON/CSV/PDF
├── dto/
│   ├── reporte-filters.dto.ts           # Filtros comunes
│   ├── dashboard-filters.dto.ts         # Filtros dashboard
│   └── export-options.dto.ts            # Opciones de exportación
└── types/
    └── reportes.types.ts                # Interfaces de respuesta
```

### 2.2 Estructura Frontend

```
frontend/src/app/dashboard/reportes/
├── page.tsx                             # Dashboard principal de reportes
├── operativos/
│   ├── page.tsx                         # Lista de reportes operativos
│   ├── turnos/page.tsx                  # Reporte de turnos
│   ├── ausentismo/page.tsx              # Reporte de ausentismo
│   └── ocupacion/page.tsx               # Ocupación por profesional
├── financieros/
│   ├── page.tsx                         # Lista de reportes financieros
│   ├── ingresos/page.tsx                # Reporte de ingresos
│   ├── morosidad/page.tsx               # Morosidad y cuentas por cobrar
│   └── pagos-pendientes/page.tsx        # Pagos pendientes
└── components/
    ├── ReporteCard.tsx                  # Card para KPI individual
    ├── ChartTendencias.tsx              # Gráfico de tendencias
    ├── TablaReporte.tsx                 # Tabla genérica de reportes
    ├── FiltrosReporte.tsx               # Componente de filtros
    └── ExportButtons.tsx                # Botones de exportación

frontend/src/hooks/
├── useReportesDashboard.ts              # Hook para dashboard principal
├── useReportesOperativos.ts             # Hooks reportes operativos
├── useReportesFinancieros.ts            # Hooks reportes financieros
└── useExportReporte.ts                  # Hook de exportación

frontend/src/types/
└── reportes.ts                          # Tipos TypeScript
```

---

## 3. Modelos de Datos Existentes a Utilizar

### Tablas principales para consultas:

| Tabla | Campos relevantes | Uso en reportes |
|-------|-------------------|-----------------|
| `Turno` | fecha, estado, profesionalId, pacienteId | Reportes de turnos, ausentismo, ocupación |
| `MovimientoCC` | monto, tipo, medioPago, fecha, anulado | Ingresos, pagos, morosidad |
| `CuentaCorriente` | saldoActual, saldoVencido | Cuentas por cobrar |
| `Factura` | total, estado, fecha | Facturación |
| `PracticaRealizada` | monto, código, fecha, estadoLiquidacion | Ingresos por prestación |
| `VentaProducto` | cantidad, precioUnitario, fecha | Tracking ventas |
| `Paciente` | fechaNacimiento, obraSocialId | Segmentación |

### Estados de Turno relevantes:
- `CONFIRMADO`, `EN_ESPERA`, `EN_CURSO`, `COMPLETADO` → Turnos atendidos
- `CANCELADO`, `AUSENTE` → Para ausentismo

---

## 4. Diseño de Endpoints API

### 4.1 Dashboard Principal (RF-020)

```typescript
// GET /reportes/dashboard
// Response: DashboardKPIs
{
  turnosHoy: number;
  turnosCompletados: number;
  turnosAusentes: number;
  ingresosHoy: number;
  proximosTurnos: Turno[];       // Próximos 5 turnos
  alertasPendientes: Alerta[];   // Del módulo alertas existente
  tendencias: {
    ingresosSemana: { fecha: string; monto: number }[];
    turnosSemana: { fecha: string; cantidad: number }[];
  };
}
```

### 4.2 Reportes Operativos (RF-021)

```typescript
// GET /reportes/operativos/turnos
// Query: { fechaDesde, fechaHasta, profesionalId?, agrupacion: 'dia'|'semana'|'mes' }
{
  total: number;
  completados: number;
  cancelados: number;
  ausentes: number;
  tasaAusentismo: number;
  detalle: {
    periodo: string;
    turnos: number;
    completados: number;
    ausentes: number;
  }[];
}

// GET /reportes/operativos/ausentismo
// Query: { fechaDesde, fechaHasta, profesionalId?, limite?: number }
{
  tasaGeneral: number;
  porPaciente: {
    pacienteId: string;
    nombre: string;
    turnosTotales: number;
    ausencias: number;
    tasa: number;
  }[];
}

// GET /reportes/operativos/ocupacion
// Query: { fechaDesde, fechaHasta }
{
  porProfesional: {
    profesionalId: string;
    nombre: string;
    turnosDisponibles: number;  // Basado en horarios configurados
    turnosAgendados: number;
    tasaOcupacion: number;
  }[];
}

// GET /reportes/operativos/procedimientos-ranking
// Query: { fechaDesde, fechaHasta, profesionalId?, limite?: number }
{
  ranking: {
    codigo: string;
    descripcion: string;
    cantidad: number;
    ingresoTotal: number;
  }[];
}

// GET /reportes/operativos/ventas-productos
// Query: { fechaDesde, fechaHasta, profesionalId? }
{
  totalVentas: number;
  cantidadProductos: number;
  ventasPorProducto: {
    productoId: string;
    nombre: string;
    cantidad: number;
    ingresos: number;
  }[];
  ventasPorPaciente: {
    pacienteId: string;
    nombre: string;
    compras: number;
    montoTotal: number;
    ultimaCompra: Date;
  }[];
}
```

### 4.3 Reportes Financieros (RF-022)

```typescript
// GET /reportes/financieros/ingresos
// Query: { fechaDesde, fechaHasta, profesionalId?, obraSocialId?, agrupacion? }
{
  totalIngresos: number;
  cantidadTransacciones: number;
  porPeriodo: { periodo: string; monto: number }[];
  porMedioPago: { medio: string; monto: number; cantidad: number }[];
}

// GET /reportes/financieros/ingresos-por-profesional
// Query: { fechaDesde, fechaHasta }
{
  porProfesional: {
    profesionalId: string;
    nombre: string;
    ingresos: number;
    cantidadTurnos: number;
    ticketPromedio: number;
  }[];
}

// GET /reportes/financieros/ingresos-por-obra-social
// Query: { fechaDesde, fechaHasta, profesionalId? }
{
  porObraSocial: {
    obraSocialId: string;
    nombre: string;
    ingresos: number;
    cantidadPacientes: number;
    cantidadPracticas: number;
  }[];
}

// GET /reportes/financieros/ingresos-por-prestacion
// Query: { fechaDesde, fechaHasta, profesionalId? }
{
  porPrestacion: {
    codigo: string;
    descripcion: string;
    cantidad: number;
    ingresoTotal: number;
    promedioUnitario: number;
  }[];
}

// GET /reportes/financieros/cuentas-por-cobrar
// Query: { profesionalId?, soloVencidas?: boolean }
{
  totalPorCobrar: number;
  totalVencido: number;
  cantidadCuentas: number;
  cuentas: {
    pacienteId: string;
    nombre: string;
    saldoActual: number;
    saldoVencido: number;
    ultimoMovimiento: Date;
  }[];
}

// GET /reportes/financieros/morosidad
// Query: { profesionalId?, diasVencimiento?: number }
{
  indiceGeneral: number;        // % de cuentas morosas
  montoTotalMoroso: number;
  cuentasMorosas: {
    pacienteId: string;
    nombre: string;
    montoVencido: number;
    diasMorosidad: number;
    ultimoPago: Date | null;
  }[];
}

// GET /reportes/financieros/pagos-pendientes
// Query: { fechaDesde?, fechaHasta?, profesionalId? }
{
  totalPendiente: number;
  porTipo: {
    tipo: string;
    cantidad: number;
    monto: number;
  }[];
  detalle: {
    id: string;
    paciente: string;
    concepto: string;
    monto: number;
    fechaVencimiento: Date;
  }[];
}
```

### 4.4 Exportación (RF-023)

```typescript
// POST /reportes/exportar
// Body: { tipoReporte, formato: 'json'|'csv'|'pdf', filtros, opciones? }
// Response: { url: string } o stream del archivo

// POST /reportes/programar-envio
// Body: { tipoReporte, formato, filtros, email, frecuencia: 'diario'|'semanal'|'mensual' }
// Response: { programacionId: string, proximoEnvio: Date }
```

---

## 5. Plan de Implementación por Fases

### Fase 1: Infraestructura Base (Backend)
**Archivos a crear:**
1. `reportes.module.ts` - Módulo principal
2. `reportes.controller.ts` - Controller con estructura base
3. `dto/reporte-filters.dto.ts` - DTOs de filtros comunes
4. `types/reportes.types.ts` - Interfaces de respuesta

**Tareas:**
- [ ] Crear estructura de carpetas del módulo
- [ ] Implementar DTOs con validación (class-validator)
- [ ] Registrar módulo en `app.module.ts`
- [ ] Implementar guards de autorización por rol

### Fase 2: Dashboard Principal (RF-020)
**Archivos backend:**
1. `services/reportes-dashboard.service.ts`

**Archivos frontend:**
1. `hooks/useReportesDashboard.ts`
2. `app/dashboard/reportes/page.tsx`
3. `components/ReporteCard.tsx`
4. `components/ChartTendencias.tsx`

**Tareas:**
- [ ] Endpoint GET /reportes/dashboard
- [ ] Query KPIs del día con Prisma aggregations
- [ ] Query tendencias últimos 7 días
- [ ] Integrar con módulo alertas existente
- [ ] UI con cards de KPIs
- [ ] Gráficos con librería de charts (recharts o similar)
- [ ] Agregar ruta a Sidebar

### Fase 3: Reportes Operativos (RF-021)
**Archivos backend:**
1. `services/reportes-operativos.service.ts`

**Archivos frontend:**
1. `hooks/useReportesOperativos.ts`
2. Páginas en `app/dashboard/reportes/operativos/`
3. `components/TablaReporte.tsx`
4. `components/FiltrosReporte.tsx`

**Tareas:**
- [ ] Endpoint reporte de turnos con agrupaciones
- [ ] Endpoint tasa de ausentismo por paciente
- [ ] Endpoint ocupación por profesional
- [ ] Endpoint ranking de procedimientos
- [ ] Endpoint tracking ventas productos
- [ ] UI con tablas, filtros por fecha, exportar
- [ ] Considerar paginación para datasets grandes

### Fase 4: Reportes Financieros (RF-022)
**Archivos backend:**
1. `services/reportes-financieros.service.ts`

**Archivos frontend:**
1. `hooks/useReportesFinancieros.ts`
2. Páginas en `app/dashboard/reportes/financieros/`

**Tareas:**
- [ ] Endpoint ingresos por período
- [ ] Endpoint ingresos por profesional
- [ ] Endpoint ingresos por obra social
- [ ] Endpoint ingresos por prestación
- [ ] Endpoint cuentas por cobrar
- [ ] Endpoint morosidad
- [ ] Endpoint pagos pendientes
- [ ] UI con gráficos de distribución (pie charts, bar charts)

### Fase 5: Exportación (RF-023)
**Archivos backend:**
1. `services/reportes-export.service.ts`
2. `dto/export-options.dto.ts`

**Archivos frontend:**
1. `hooks/useExportReporte.ts`
2. `components/ExportButtons.tsx`

**Tareas:**
- [ ] Implementar exportación JSON (nativo)
- [ ] Implementar exportación CSV (librería: `json2csv` o similar)
- [ ] Implementar exportación PDF (librería: `pdfkit` o `puppeteer`)
- [ ] UI botones de descarga por formato
- [ ] (Opcional) Envío programado por email con cron jobs

---

## 6. Consideraciones Técnicas

### 6.1 Performance
- **Índices en Prisma:** Verificar que existan índices en campos usados en WHERE y GROUP BY
- **Agregaciones:** Usar `prisma.model.aggregate()` y `groupBy()` en lugar de traer todos los registros
- **Caché:** Considerar caché de TanStack Query con `staleTime` mayor para reportes que no cambian cada segundo
- **Paginación:** Para reportes con muchas filas, implementar paginación server-side

### 6.2 Queries Prisma Ejemplo

```typescript
// KPIs del día
const turnosHoy = await this.prisma.turno.groupBy({
  by: ['estado'],
  where: {
    fecha: {
      gte: startOfDay(new Date()),
      lt: endOfDay(new Date()),
    },
    profesionalId: filtros.profesionalId,
  },
  _count: true,
});

// Ingresos agrupados por mes
const ingresosPorMes = await this.prisma.movimientoCC.groupBy({
  by: ['fecha'],
  where: {
    tipo: 'PAGO',
    anulado: false,
    fecha: { gte: fechaDesde, lte: fechaHasta },
  },
  _sum: { monto: true },
});

// Morosidad - raw query si es necesario para cálculos complejos
const morosidad = await this.prisma.$queryRaw`
  SELECT
    p.id as "pacienteId",
    p.nombre,
    cc."saldoVencido" as "montoVencido",
    EXTRACT(DAY FROM NOW() - MAX(m.fecha)) as "diasMorosidad"
  FROM "CuentaCorriente" cc
  JOIN "Paciente" p ON cc."pacienteId" = p.id
  LEFT JOIN "MovimientoCC" m ON m."cuentaCorrienteId" = cc.id AND m.tipo = 'PAGO'
  WHERE cc."saldoVencido" > 0
  GROUP BY p.id, p.nombre, cc."saldoVencido"
`;
```

### 6.3 Multi-tenant y Seguridad
- **Todos los endpoints** deben filtrar por `profesionalId` del contexto
- **Roles:** Admin ve todo, Profesional solo su data, Secretaria según configuración
- **Validación:** DTOs deben validar que el `profesionalId` solicitado coincida con permisos del usuario

### 6.4 Librerías Sugeridas

**Backend:**
- `date-fns` - Manipulación de fechas (ya presente en el proyecto)
- `json2csv` - Exportación CSV
- `pdfkit` o `@react-pdf/renderer` - Generación de PDF

**Frontend:**
- `recharts` o `chart.js` - Gráficos
- `react-date-range` - Selector de rango de fechas (si no existe)
- `file-saver` - Descarga de archivos en el cliente

---

## 7. Tipos TypeScript Frontend

```typescript
// frontend/src/types/reportes.ts

export interface DashboardKPIs {
  turnosHoy: number;
  turnosCompletados: number;
  turnosAusentes: number;
  ingresosHoy: number;
  proximosTurnos: TurnoResumen[];
  alertasPendientes: Alerta[];
  tendencias: TendenciasData;
}

export interface TendenciasData {
  ingresosSemana: SerieTemporalItem[];
  turnosSemana: SerieTemporalItem[];
}

export interface SerieTemporalItem {
  fecha: string;
  valor: number;
}

export interface ReporteTurnos {
  total: number;
  completados: number;
  cancelados: number;
  ausentes: number;
  tasaAusentismo: number;
  detalle: ReporteTurnosDetalle[];
}

export interface ReporteAusentismo {
  tasaGeneral: number;
  porPaciente: AusentismoPorPaciente[];
}

export interface ReporteIngresos {
  totalIngresos: number;
  cantidadTransacciones: number;
  porPeriodo: IngresosPorPeriodo[];
  porMedioPago: IngresosPorMedioPago[];
}

export interface ReporteMorosidad {
  indiceGeneral: number;
  montoTotalMoroso: number;
  cuentasMorosas: CuentaMorosa[];
}

export interface ReporteFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  profesionalId?: string;
  obraSocialId?: string;
  agrupacion?: 'dia' | 'semana' | 'mes';
}

export type FormatoExportacion = 'json' | 'csv' | 'pdf';

export interface ExportOptions {
  tipoReporte: string;
  formato: FormatoExportacion;
  filtros: ReporteFilters;
}
```

---

## 8. Checklist Pre-Implementación

- [ ] Verificar que todos los modelos Prisma necesarios existen y tienen los campos requeridos
- [ ] Confirmar que existen índices para queries frecuentes
- [ ] Decidir librería de gráficos para frontend
- [ ] Confirmar requerimientos de PDF (template, logo, etc.)
- [ ] Definir si se implementa envío por email (requiere servicio de email configurado)
- [ ] Revisar permisos por rol para cada reporte

---

## 9. Orden de Implementación Recomendado

1. **Backend base** → Módulo, DTOs, Controller estructura
2. **Dashboard service** → KPIs básicosre
3. **Frontend dashboard** → UI con cards y gráficos
4. **Reportes operativos backend** → Un endpoint a la vez
5. **Reportes financieros backend** → Reutilizar lógica de finanzas existente
6. **Frontend reportes** → Páginas con filtros y tablas
7. **Exportación** → JSON/CSV primero, PDF después
8. **Testing** → Tests unitarios para servicios de agregación
9. **(Opcional) Email programado** → Cron jobs con queue

---

## 10. Mejoras Avanzadas Propuestas

### 10.1 Analytics Avanzado e Inteligencia de Negocio

#### Comparativas Temporales
```typescript
// GET /reportes/comparativa
// Query: { metrica, periodoActual, periodoAnterior }
{
  actual: { valor: number; periodo: string };
  anterior: { valor: number; periodo: string };
  variacion: number;          // Porcentaje de cambio
  tendencia: 'up' | 'down' | 'stable';
}
```
- **Comparación MoM (mes vs mes anterior)**
- **Comparación YoY (año vs año anterior)**
- **Comparación períodos personalizados**
- Indicadores visuales de tendencia (flechas verdes/rojas)

#### Proyecciones y Forecasting
```typescript
// GET /reportes/proyeccion
// Query: { metrica, mesesFuturos: number }
{
  historico: SerieTemporalItem[];
  proyeccion: SerieTemporalItem[];  // Basado en tendencia histórica
  confianza: number;                // % de confianza del modelo
}
```
- Proyección de ingresos para los próximos N meses
- Proyección de demanda de turnos
- Algoritmo simple: media móvil ponderada o regresión lineal

#### Detección de Anomalías
```typescript
// GET /reportes/anomalias
{
  anomalias: {
    fecha: Date;
    metrica: string;
    valorEsperado: number;
    valorReal: number;
    desviacion: number;
    severidad: 'baja' | 'media' | 'alta';
  }[];
}
```
- Alertar cuando un día tiene ingresos inusualmente bajos/altos
- Detectar picos de ausentismo
- Basado en desviación estándar del histórico

#### Segmentación de Pacientes (Análisis RFM)
```typescript
// GET /reportes/segmentacion-pacientes
{
  segmentos: {
    nombre: string;           // "VIP", "En riesgo", "Nuevos", "Dormidos"
    cantidad: number;
    pacientes: {
      id: string;
      nombre: string;
      recencia: number;       // Días desde última visita
      frecuencia: number;     // Visitas en período
      monetario: number;      // Gasto total
      score: number;          // Score RFM combinado
    }[];
  }[];
}
```
- **R (Recency):** Días desde última visita
- **F (Frequency):** Cantidad de visitas en el período
- **M (Monetary):** Gasto total del paciente
- Clasificación automática: Champions, Leales, En Riesgo, Perdidos

#### Customer Lifetime Value (LTV)
```typescript
// GET /reportes/pacientes/ltv
{
  ltvPromedio: number;
  distribucion: {
    rango: string;            // "$0-500", "$500-1000", etc.
    cantidad: number;
  }[];
  topPacientes: {
    id: string;
    nombre: string;
    ltv: number;
    mesesActivo: number;
  }[];
}
```
- Valor de vida del paciente calculado
- Identificar pacientes más valiosos
- Fórmula: `(Ticket Promedio × Frecuencia Anual × Años Promedio Retención)`

#### Análisis de Cohortes
```typescript
// GET /reportes/cohortes
// Query: { tipoCohorte: 'mes_alta' | 'origen' | 'obra_social' }
{
  cohortes: {
    nombre: string;           // "Enero 2024", "Derivación Dr. X"
    mesAlta: string;
    pacientes: number;
    retencion: {
      mes1: number;           // % que volvió en mes 1
      mes3: number;
      mes6: number;
      mes12: number;
    };
    ltvPromedio: number;
  }[];
}
```
- Ver retención de pacientes por mes de alta
- Comparar cohortes por origen/derivación
- Identificar qué cohortes tienen mejor retención

#### Predicción de Churn
```typescript
// GET /reportes/riesgo-abandono
{
  pacientesEnRiesgo: {
    id: string;
    nombre: string;
    probabilidadAbandono: number;  // 0-100%
    diasSinVisita: number;
    frecuenciaAnterior: number;
    ultimoProcedimiento: string;
    accionSugerida: string;        // "Llamar", "Enviar promoción", etc.
  }[];
}
```
- Identificar pacientes que probablemente no volverán
- Basado en: días sin visita vs frecuencia histórica
- Sugerir acciones de retención

---

### 10.2 Dashboards Personalizables

#### Sistema de Widgets
```typescript
// Modelo Prisma nuevo
model DashboardConfig {
  id            String   @id @default(uuid())
  usuarioId     String
  nombre        String
  widgets       Json     // Array de widgets con posición y config
  esDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
}

// Estructura de widget
interface Widget {
  id: string;
  tipo: 'kpi' | 'grafico_linea' | 'grafico_barra' | 'grafico_pie' | 'tabla' | 'lista';
  titulo: string;
  metrica: string;              // 'ingresos', 'turnos', 'ausentismo', etc.
  filtros: ReporteFilters;
  posicion: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;  // Colores, límites, etc.
}
```
- **Drag & drop** de widgets en el dashboard
- **Redimensionar** widgets
- **Múltiples dashboards** guardados por usuario
- **Plantillas predefinidas** por rol (Admin, Profesional, Secretaria)

#### Reportes Guardados
```typescript
// POST /reportes/guardar
// Body: { nombre, tipoReporte, filtros, formato? }
model ReporteGuardado {
  id            String   @id @default(uuid())
  usuarioId     String
  nombre        String
  tipoReporte   String
  filtros       Json
  createdAt     DateTime @default(now())
}

// GET /reportes/guardados
// Lista reportes guardados del usuario
```
- Guardar configuración de reportes frecuentes
- Acceso rápido desde sidebar
- Compartir reportes entre usuarios (opcional)

#### Filtros en URL (Deep Linking)
```
/dashboard/reportes/financieros/ingresos?desde=2024-01-01&hasta=2024-12-31&profesional=abc123
```
- Filtros persistidos en query params
- Compartir links a reportes específicos
- Historial del navegador funciona correctamente

---

### 10.3 Sistema de Alertas Inteligentes

#### Alertas por Umbrales Configurables
```typescript
// Modelo Prisma
model AlertaConfiguracion {
  id              String   @id @default(uuid())
  usuarioId       String
  metrica         String   // 'ingresos_diarios', 'tasa_ausentismo', etc.
  condicion       String   // 'menor_que', 'mayor_que', 'cambio_porcentual'
  umbral          Decimal
  frecuencia      String   // 'instantanea', 'diaria', 'semanal'
  canales         String[] // ['email', 'push', 'interno']
  activa          Boolean  @default(true)
}

// POST /alertas/configurar
// Body: AlertaConfiguracion
```
- Configurar: "Alertar si ingresos diarios < $X"
- Configurar: "Alertar si ausentismo > 20%"
- Configurar: "Alertar si caen ingresos más del 15% vs semana anterior"

#### Notificaciones Proactivas
```typescript
// Integrar con módulo alertas existente
// Cron job diario que evalúa condiciones

// GET /alertas/resumen-diario
{
  alertasActivas: number;
  metricas: {
    metrica: string;
    estado: 'normal' | 'warning' | 'critical';
    valorActual: number;
    umbral: number;
  }[];
}
```
- Email matutino con resumen de métricas
- Push notification cuando se dispara alerta
- Badge en el icono de alertas del sidebar

#### Alertas de Tendencias Negativas
- Detectar automáticamente 3+ días consecutivos de baja
- Alertar cuando una métrica cae por debajo del percentil 20 histórico
- Sugerir acciones basadas en el tipo de alerta

---

### 10.4 Performance y Escalabilidad

#### Tablas de Resumen Pre-calculadas
```typescript
// Modelo Prisma - Tabla desnormalizada para queries rápidas
model ResumenDiario {
  id              String   @id @default(uuid())
  fecha           DateTime @db.Date
  profesionalId   String
  turnosTotales   Int
  turnosCompletados Int
  turnosAusentes  Int
  ingresosBrutos  Decimal
  ingresosNetos   Decimal
  ticketPromedio  Decimal
  pacientesNuevos Int
  pacientesRecurrentes Int
  createdAt       DateTime @default(now())

  @@unique([fecha, profesionalId])
  @@index([fecha])
  @@index([profesionalId, fecha])
}
```
- Cron job nocturno que calcula y guarda resúmenes
- Queries de dashboard leen de tabla pre-calculada
- Reducción drástica de tiempo de respuesta

#### Estrategia de Caché
```typescript
// Backend - Caché con TTL por tipo de reporte
const CACHE_TTL = {
  dashboard: 60,           // 1 minuto - datos en vivo
  reporteDiario: 300,      // 5 minutos
  reporteMensual: 3600,    // 1 hora
  reporteAnual: 86400,     // 24 horas
};

// Implementar con Redis o caché en memoria (node-cache)
```
- Dashboard: caché corto (datos más frescos)
- Reportes históricos: caché largo (no cambian)
- Invalidación al registrar nuevos movimientos

#### Lazy Loading de Gráficos
```typescript
// Frontend - Cargar gráficos bajo demanda
const ChartTendencias = dynamic(
  () => import('./ChartTendencias'),
  {
    loading: () => <Skeleton className="h-64" />,
    ssr: false
  }
);
```
- Cargar primero los KPIs (datos livianos)
- Gráficos se cargan cuando entran en viewport
- Skeleton loaders mientras carga

#### Paginación y Virtualización
```typescript
// Backend - Paginación cursor-based para tablas grandes
// GET /reportes/morosidad?cursor=xyz&limit=50

// Frontend - Virtualización para listas largas
import { useVirtualizer } from '@tanstack/react-virtual';
```
- Nunca traer más de 100 registros sin paginación
- Virtualización para tablas con 1000+ filas
- Scroll infinito donde tenga sentido

---

### 10.5 UX Avanzado

#### Drill-down Interactivo
```typescript
// Ejemplo: Click en barra de "Ingresos Enero" → Detalle por día
// Click en día específico → Lista de transacciones

interface DrilldownConfig {
  nivel: number;              // 0: año, 1: mes, 2: día, 3: detalle
  filtrosAcumulados: ReporteFilters[];
  breadcrumb: string[];       // ["2024", "Enero", "15/01"]
}
```
- Click en gráfico para profundizar
- Breadcrumb para volver a niveles anteriores
- Mantener contexto de filtros

#### Tooltips Informativos
```typescript
// Componente KPI con tooltip de contexto
<ReporteCard
  titulo="Ingresos Hoy"
  valor={formatCurrency(ingresosHoy)}
  variacion={+12}
  tooltip={{
    comparacion: "vs. mismo día semana pasada",
    historico: "Promedio últimos 30 días: $X",
    tendencia: "3er mejor día del mes"
  }}
/>
```
- Hover en KPI muestra comparativa
- Contexto histórico
- Explicación de cómo se calcula

#### Modo Comparación
```typescript
// UI: Dos paneles lado a lado
// Comparar: Enero 2024 vs Enero 2023
// Comparar: Profesional A vs Profesional B
// Comparar: Obra Social X vs Particular

interface ModoComparacion {
  habilitado: boolean;
  panelIzquierdo: ReporteFilters;
  panelDerecho: ReporteFilters;
}
```
- Split view para comparar dos períodos/segmentos
- Mismas métricas, diferentes filtros
- Resaltar diferencias

#### Shortcuts de Períodos
```typescript
// Componente de filtro con presets
const PERIOD_PRESETS = [
  { label: 'Hoy', getValue: () => ({ desde: startOfDay(new Date()), hasta: endOfDay(new Date()) }) },
  { label: 'Ayer', getValue: () => ({ desde: startOfYesterday(), hasta: endOfYesterday() }) },
  { label: 'Últimos 7 días', getValue: () => ({ desde: subDays(new Date(), 7), hasta: new Date() }) },
  { label: 'Este mes', getValue: () => ({ desde: startOfMonth(new Date()), hasta: endOfMonth(new Date()) }) },
  { label: 'Mes pasado', getValue: () => ({ desde: startOfMonth(subMonths(new Date(), 1)), hasta: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Este año', getValue: () => ({ desde: startOfYear(new Date()), hasta: new Date() }) },
  { label: 'Año pasado', getValue: () => ({ desde: startOfYear(subYears(new Date(), 1)), hasta: endOfYear(subYears(new Date(), 1)) }) },
  { label: 'Personalizado', getValue: null },
];
```
- Botones rápidos para períodos comunes
- Picker de rango para personalizado
- Recordar última selección del usuario

#### Atajos de Teclado
```typescript
// Shortcuts para power users
const KEYBOARD_SHORTCUTS = {
  'cmd+e': 'exportar',
  'cmd+r': 'refrescar',
  'cmd+f': 'focus filtros',
  'cmd+1': 'preset hoy',
  'cmd+2': 'preset semana',
  'cmd+3': 'preset mes',
};
```

---

### 10.6 Reportes de Pacientes (Perfil 360°)

#### Ficha Completa del Paciente
```typescript
// GET /reportes/paciente/:id/perfil-360
{
  // Datos básicos
  paciente: Paciente;

  // Métricas de valor
  ltv: number;
  scoreRFM: number;
  segmento: string;

  // Historial financiero
  gastoTotal: number;
  gastoPromedioPorVisita: number;
  metodoPagoPreferido: string;
  tieneDeuda: boolean;
  montoDeuda: number;

  // Historial de visitas
  totalVisitas: number;
  primeraVisita: Date;
  ultimaVisita: Date;
  frecuenciaPromedio: number;      // Días entre visitas
  tasaAusentismo: number;

  // Procedimientos
  procedimientosFrecuentes: { codigo: string; nombre: string; cantidad: number }[];

  // Productos comprados
  productosComprados: { nombre: string; cantidad: number; ultimaCompra: Date }[];

  // Profesionales que lo atendieron
  profesionales: { id: string; nombre: string; visitas: number }[];

  // Timeline de interacciones
  timeline: {
    fecha: Date;
    tipo: 'turno' | 'pago' | 'compra' | 'mensaje';
    descripcion: string;
  }[];
}
```
- Vista unificada de toda la relación con el paciente
- Accesible desde ficha del paciente
- Exportable como PDF

#### Score de Fidelización
```typescript
// Calculado automáticamente
interface ScoreFidelizacion {
  score: number;              // 0-100
  factores: {
    recencia: number;         // 0-25 puntos
    frecuencia: number;       // 0-25 puntos
    monetario: number;        // 0-25 puntos
    engagement: number;       // 0-25 puntos (responde mensajes, no cancela, etc.)
  };
  recomendaciones: string[];  // "Ofrecer descuento", "Agendar control", etc.
}
```

---

### 10.7 Reportes de Productividad

#### Eficiencia de Agenda
```typescript
// GET /reportes/productividad/eficiencia-agenda
{
  porProfesional: {
    profesionalId: string;
    nombre: string;
    horasDisponibles: number;     // Según config de horarios
    horasAgendadas: number;
    horasAtendidas: number;       // Descontando ausentes
    tasaOcupacion: number;        // agendadas/disponibles
    tasaEfectividad: number;      // atendidas/agendadas
    tiempoMuertoPromedio: number; // Minutos entre turnos
  }[];
}
```

#### Tiempos de Atención
```typescript
// GET /reportes/productividad/tiempos
// Requiere: registrar hora inicio/fin de atención en Turno
{
  tiempoPromedioEspera: number;      // Minutos que espera el paciente
  tiempoPromedioAtencion: number;    // Duración de la consulta
  porTipoProcedimiento: {
    tipo: string;
    tiempoPromedio: number;
    desviacion: number;
  }[];
  porProfesional: {
    profesionalId: string;
    nombre: string;
    tiempoPromedio: number;
  }[];
}
```

#### Comparativa entre Profesionales
```typescript
// GET /reportes/productividad/comparativa
// Solo visible para Admin
{
  ranking: {
    profesionalId: string;
    nombre: string;
    ingresos: number;
    pacientesAtendidos: number;
    ticketPromedio: number;
    tasaRetencion: number;
    satisfaccion: number;          // Si hay encuestas
  }[];
  promedioClinica: {
    ingresos: number;
    pacientesAtendidos: number;
    ticketPromedio: number;
  };
}
```

---

### 10.8 Integraciones Externas

#### API para Herramientas de BI
```typescript
// Endpoints optimizados para conexión con Metabase, Looker, Power BI
// GET /api/bi/turnos?format=flat
// GET /api/bi/ingresos?format=flat
// GET /api/bi/pacientes?format=flat

// Autenticación con API Key específica para BI
model ApiKey {
  id          String   @id @default(uuid())
  clinicaId   String
  nombre      String
  key         String   @unique
  permisos    String[] // ['read:turnos', 'read:ingresos', etc.]
  activa      Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```
- Datos en formato plano (no anidado) para fácil importación
- Autenticación por API Key
- Rate limiting para no afectar producción

#### Webhooks para Eventos
```typescript
// POST /webhooks/configurar
model WebhookConfig {
  id          String   @id @default(uuid())
  clinicaId   String
  evento      String   // 'reporte_generado', 'alerta_disparada', 'meta_alcanzada'
  url         String
  secreto     String
  activo      Boolean  @default(true)
}

// Payload enviado
{
  evento: string;
  timestamp: Date;
  data: any;
  signature: string;  // HMAC del payload
}
```
- Notificar sistemas externos cuando se genera un reporte
- Integrar con Slack, Teams, etc.
- Sincronizar con ERP externo

#### Exportación a Google Sheets
```typescript
// POST /reportes/exportar-sheets
// Body: { tipoReporte, filtros, spreadsheetId? }
// Response: { spreadsheetUrl: string }
```
- Crear nueva hoja o actualizar existente
- OAuth con Google
- Útil para análisis adicional en Sheets

---

### 10.9 Auditoría y Compliance

#### Log de Acceso a Reportes
```typescript
// Modelo Prisma
model ReporteAcceso {
  id            String   @id @default(uuid())
  usuarioId     String
  tipoReporte   String
  filtros       Json
  formato       String?          // null si solo visualizó
  ip            String
  userAgent     String
  timestamp     DateTime @default(now())

  @@index([usuarioId, timestamp])
  @@index([tipoReporte, timestamp])
}

// GET /admin/auditoria/accesos
// Filtrar por usuario, reporte, fecha
```
- Registrar quién accedió a qué reportes
- Cumplimiento con normativas de privacidad
- Detectar accesos sospechosos

#### Reporte de Auditoría de Datos
```typescript
// GET /reportes/auditoria/modificaciones
{
  modificaciones: {
    entidad: string;          // 'Paciente', 'Turno', 'Pago'
    entidadId: string;
    campo: string;
    valorAnterior: any;
    valorNuevo: any;
    usuarioId: string;
    timestamp: Date;
  }[];
}
```
- Historial de cambios en datos sensibles
- Quién modificó qué y cuándo
- Requerido para auditorías médicas

#### Data Retention
```typescript
// Configuración de retención de datos
model DataRetentionPolicy {
  id            String   @id @default(uuid())
  entidad       String
  diasRetencion Int
  accion        String   // 'anonimizar', 'eliminar', 'archivar'
}

// Cron job que aplica políticas
// Ej: Anonimizar datos de pacientes inactivos > 5 años
```

---

### 10.10 Mobile y Accesibilidad

#### Dashboard Responsive
```typescript
// Breakpoints para reportes
// Mobile: 1 columna, KPIs apilados, gráficos simplificados
// Tablet: 2 columnas, gráficos completos
// Desktop: Layout completo con sidebar

// Gráficos adaptativos
const chartConfig = {
  mobile: { showLegend: false, showLabels: false },
  tablet: { showLegend: true, showLabels: false },
  desktop: { showLegend: true, showLabels: true },
};
```

#### PWA con Caché Offline
```typescript
// Service Worker para cachear reportes
// manifest.json para instalación

// Estrategia: Network first, cache fallback
// Reportes guardados disponibles offline
```
- Instalar como app en móvil
- Ver último reporte cargado sin conexión
- Sincronizar cuando vuelva la conexión

#### Accesibilidad (a11y)
- Colores con suficiente contraste
- Gráficos con texto alternativo
- Navegación por teclado completa
- Labels en todos los inputs
- Screen reader friendly

---

### 10.11 Gamificación y Metas

#### Sistema de Metas
```typescript
// Modelo Prisma
model Meta {
  id              String   @id @default(uuid())
  profesionalId   String
  tipo            String   // 'ingresos', 'turnos', 'nuevos_pacientes'
  periodo         String   // 'diario', 'semanal', 'mensual'
  objetivo        Decimal
  fechaInicio     DateTime
  fechaFin        DateTime
}

// GET /reportes/metas/progreso
{
  metas: {
    id: string;
    tipo: string;
    objetivo: number;
    actual: number;
    porcentaje: number;
    diasRestantes: number;
    proyeccion: number;       // Proyección al final del período
    enCamino: boolean;
  }[];
}
```
- Definir metas mensuales de ingresos
- Tracking visual del progreso
- Notificación al alcanzar meta

#### Logros y Badges
```typescript
// Premiar comportamientos positivos
const LOGROS = [
  { id: 'primer_millon', nombre: 'Primer Millón', condicion: 'ingresos_totales >= 1000000' },
  { id: 'cero_ausentes', nombre: 'Asistencia Perfecta', condicion: 'mes_sin_ausentes' },
  { id: 'top_retencion', nombre: 'Fidelizador', condicion: 'retencion_anual >= 80%' },
];
```
- Motivar al equipo
- Mostrar en perfil del profesional
- Opcional/configurable

---

## 11. Priorización de Mejoras

### Alta Prioridad (Implementar en Fase 1-2)
| Mejora | Justificación | Esfuerzo |
|--------|---------------|----------|
| Comparativas temporales (MoM/YoY) | Muy solicitado, alto valor | Medio |
| Shortcuts de períodos | UX básico esperado | Bajo |
| Filtros en URL | Permite compartir reportes | Bajo |
| Tablas pre-calculadas | Performance crítico | Alto |
| Caché de queries | Performance crítico | Medio |

### Media Prioridad (Fase 3-4)
| Mejora | Justificación | Esfuerzo |
|--------|---------------|----------|
| Segmentación RFM | Alto valor de negocio | Alto |
| Alertas por umbrales | Proactividad | Medio |
| Drill-down en gráficos | UX avanzado | Medio |
| Dashboard personalizable | Diferenciador | Alto |
| Perfil 360 paciente | Valor clínico | Medio |

### Baja Prioridad (Fase 5+)
| Mejora | Justificación | Esfuerzo |
|--------|---------------|----------|
| Proyecciones/Forecasting | Nice to have | Alto |
| Predicción de churn | ML requerido | Muy Alto |
| API para BI externo | Casos específicos | Medio |
| Gamificación | Opcional | Medio |
| PWA offline | Mobile secundario | Alto |

---

## 12. Nuevos Endpoints Resumidos

```
# Analytics Avanzado
GET  /reportes/comparativa
GET  /reportes/proyeccion
GET  /reportes/anomalias
GET  /reportes/segmentacion-pacientes
GET  /reportes/pacientes/ltv
GET  /reportes/cohortes
GET  /reportes/riesgo-abandono

# Personalización
POST /reportes/guardar
GET  /reportes/guardados
POST /dashboard/config
GET  /dashboard/config

# Alertas
POST /alertas/configurar
GET  /alertas/configuraciones
GET  /alertas/resumen-diario

# Pacientes
GET  /reportes/paciente/:id/perfil-360
GET  /reportes/paciente/:id/score-fidelizacion

# Productividad
GET  /reportes/productividad/eficiencia-agenda
GET  /reportes/productividad/tiempos
GET  /reportes/productividad/comparativa

# Integraciones
GET  /api/bi/turnos
GET  /api/bi/ingresos
POST /webhooks/configurar
POST /reportes/exportar-sheets

# Auditoría
GET  /admin/auditoria/accesos
GET  /reportes/auditoria/modificaciones

# Metas
POST /metas
GET  /reportes/metas/progreso
```

---

## 13. Modelos Prisma Adicionales Requeridos

```prisma
// Agregar a schema.prisma

model ResumenDiario {
  id                    String   @id @default(uuid())
  fecha                 DateTime @db.Date
  profesionalId         String
  profesional           Profesional @relation(fields: [profesionalId], references: [id])
  turnosTotales         Int
  turnosCompletados     Int
  turnosAusentes        Int
  ingresosBrutos        Decimal  @db.Decimal(12, 2)
  ingresosNetos         Decimal  @db.Decimal(12, 2)
  ticketPromedio        Decimal  @db.Decimal(10, 2)
  pacientesNuevos       Int
  pacientesRecurrentes  Int
  createdAt             DateTime @default(now())

  @@unique([fecha, profesionalId])
  @@index([fecha])
  @@index([profesionalId, fecha])
}

model DashboardConfig {
  id          String   @id @default(uuid())
  usuarioId   String
  usuario     Usuario  @relation(fields: [usuarioId], references: [id])
  nombre      String
  widgets     Json
  esDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([usuarioId])
}

model ReporteGuardado {
  id          String   @id @default(uuid())
  usuarioId   String
  usuario     Usuario  @relation(fields: [usuarioId], references: [id])
  nombre      String
  tipoReporte String
  filtros     Json
  createdAt   DateTime @default(now())

  @@index([usuarioId])
}

model AlertaConfiguracion {
  id          String   @id @default(uuid())
  usuarioId   String
  usuario     Usuario  @relation(fields: [usuarioId], references: [id])
  metrica     String
  condicion   String
  umbral      Decimal  @db.Decimal(12, 2)
  frecuencia  String
  canales     String[]
  activa      Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([usuarioId, activa])
}

model ReporteAcceso {
  id          String   @id @default(uuid())
  usuarioId   String
  usuario     Usuario  @relation(fields: [usuarioId], references: [id])
  tipoReporte String
  filtros     Json
  formato     String?
  ip          String
  userAgent   String
  timestamp   DateTime @default(now())

  @@index([usuarioId, timestamp])
  @@index([tipoReporte, timestamp])
}

model Meta {
  id              String   @id @default(uuid())
  profesionalId   String
  profesional     Profesional @relation(fields: [profesionalId], references: [id])
  tipo            String
  periodo         String
  objetivo        Decimal  @db.Decimal(12, 2)
  fechaInicio     DateTime
  fechaFin        DateTime
  createdAt       DateTime @default(now())

  @@index([profesionalId, fechaFin])
}

model ApiKey {
  id          String   @id @default(uuid())
  clinicaId   String
  nombre      String
  key         String   @unique
  permisos    String[]
  activa      Boolean  @default(true)
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime?

  @@index([key])
}

model WebhookConfig {
  id          String   @id @default(uuid())
  clinicaId   String
  evento      String
  url         String
  secreto     String
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([clinicaId, activo])
}
```

---

*Documento actualizado con mejoras avanzadas para sistema de reportes empresarial.*
