# Phase 5: Dashboard de Conversion - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

El profesional y el coordinador ven en el dashboard todas las métricas de conversión: embudo con tasas de paso entre etapas, ingreso potencial del pipeline, motivos de pérdida y performance de seguimiento del equipo (SECRETARIA). No incluye creación de nuevas métricas ni vistas fuera del dashboard existente.

</domain>

<decisions>
## Implementation Decisions

### Visualización del embudo
- Trapecio clásico (funnel): barras decrecientes de arriba a abajo, cada etapa con conteo de pacientes
- Tasa de paso aparece ENTRE cada par de etapas (↓ 67% entre CONTACTADO y CONSULTA, etc.)
- El embudo termina en CIRUGIA (conversión exitosa) — los perdidos NO forman parte del flujo del embudo
- Los perdidos se muestran en una tarjeta separada al lado del embudo (total + info de motivos)
- El embudo es un snapshot actual (cuántos pacientes hay HOY en cada etapa), no muestra evolución del período

### Filtro de período
- Opciones fijas: Esta semana / Este mes / Este trimestre
- Período por defecto al abrir: Este mes
- Cada widget tiene su propio filtro independiente (no hay filtro global)
- La selección de período por widget persiste en localStorage entre sesiones

### Ingreso potencial del pipeline
- Se muestra como un único número total (sin desglose por etapa)
- Solo cuenta presupuestos en estado "enviado" con paciente en temperatura CALIENTE
- Tiene su propio filtro de período independiente (semana/mes/trimestre)
- **Visibilidad por tier:** el widget solo se muestra en tiers con acceso a datos financieros. En el tier básico, el espacio desaparece y el layout se comprime (sin upgrade prompt)

### Performance del coordinador (SECRETARIA)
- Visible únicamente para roles PROFESIONAL y ADMIN (vista gerencial, la SECRETARIA no la ve)
- Tabla con columnas: Nombre | Interacciones registradas | Pacientes contactados | % Conversión personal
- % Conversión = qué porcentaje de pacientes contactados avanzaron de etapa CRM
- Tiene su propio filtro de período independiente (semana/mes/trimestre), default esta semana

### Claude's Discretion
- Diseño específico de la tarjeta de "perdidos" (layout interno, qué información muestra)
- Manejo de estados vacíos en cada widget (sin datos para el período)
- Skeleton/loading states
- Orden y disposición exacta de los widgets en el dashboard

</decisions>

<specifics>
## Specific Ideas

- El embudo debe visualizarse como un trapecio clásico de CRM, no como barras verticales ni tarjetas horizontales
- La tasa de conversión mostrada entre etapas es la tasa de paso (etapa N → etapa N+1), no la tasa global
- El widget financiero de pipeline debe sentirse premium — su ausencia en tier básico no debe romper el layout

</specifics>

<deferred>
## Deferred Ideas

- Desglose del ingreso potencial por etapa CRM — posible mejora futura del widget financiero
- Vista de performance para la SECRETARIA (que vea sus propios datos) — futura fase de mejora de UX por rol
- Upgrade prompt para tier básico — decisión de producto para cuando se defina la estrategia de monetización

</deferred>

---

*Phase: 05-dashboard-de-conversion*
*Context gathered: 2026-03-02*
