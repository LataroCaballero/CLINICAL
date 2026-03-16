# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.1 — Vista del Facturador

**Shipped:** 2026-03-16
**Phases:** 4 (8–11) | **Plans:** 9 | **Timeline:** 3 days

### What Was Built
- Schema DB extendido con tipos AFIP-ready (CondicionIVA, MonedaFactura, LimiteFacturacionMensual) y campos de auditoría en PracticaRealizada vía migración SQL manual segura
- Documento de referencia técnica AFIP/ARCA de 774 líneas con contrato TypeScript EmitirComprobante — elimina necesidad de re-research para v1.2
- Capa backend de facturación completa: timezone utility getMonthBoundariesART(), 5 métodos FinanzasService con TDD, 7 endpoints nuevos (ADMIN+FACTURADOR), AfipStubService inyectable
- Dashboard exclusivo `/dashboard/facturador` con redirect automático, KPI cards por OS, barra de progreso límite mensual, configuración de límite
- Flujo de liquidación completo: edición inline montoPagado por práctica con estado local, modal de confirmación CerrarLote, transacción atómica `$transaction`

### What Worked
- **TDD RED-GREEN en Phase 9**: escribir tests fallidos primero y luego implementar aceleró la verificación y produjo código más robusto
- **AFIP research como Phase separada**: documentar primero antes de implementar (stub) evitó decisiones de arquitectura tardías; el stub de Phase 9 implementó la interfaz exacta del doc
- **Migración SQL manual**: escribir el SQL a mano (no auto-generado por Prisma) permitió el patrón add-nullable → backfill → NOT NULL → drop que Prisma no habría manejado correctamente
- **profesionalId explícito como convención**: decidir en Phase 9 que FACTURADOR no tiene Profesional record y que profesionalId siempre es parámetro explícito previno problemas de JWT lookup en todas las fases siguientes
- **Velocidad**: 9 planes en 3 días (est. ~57min total de ejecución); milestone cerrado sin blockers reales

### What Was Inefficient
- **ROADMAP.md no actualizado en tiempo real**: Phase 8 estaba marcada `[ ]` en lugar de `[x]` al completarse; los requisitos SCHEMA-01..03 y AFIP-01 nunca se marcaron como completados en REQUIREMENTS.md — requirió reconciliación manual en el archivado
- **STATE.md con datos desactualizados**: el progress quedó en 33% (Phase 9 Plan 01) en lugar de actualizarse al 100%; el campo `last_activity` tampoco se actualizó durante la ejecución
- **Accomplishments vacíos en gsd-tools**: el CLI no pudo extraer one_liners porque los SUMMARY.md no tienen ese campo — requirió edición manual de MILESTONES.md

### Patterns Established
- `getMonthBoundariesART()`: patrón `Date.UTC(year, month-1, 1, 3, 0, 0, 0)` para boundaries ART correctos — replicar en cualquier cálculo de período mensual en finanzas
- Transacción atómica: siempre usar la forma callback de `$transaction(async tx => {...})` cuando el segundo statement necesita el ID del primero (no la forma array)
- Server-side totals: calcular `montoTotal` dentro de `$transaction` desde los datos reales, nunca aceptar del cliente — regla para todos los endpoints financieros
- AfipStubService como contrato: el stub registrado en providers+exports permite swap-out sin cambiar consumidores en v1.2
- `prisma migrate deploy` para entornos sin TTY: documentar el SQL manualmente y aplicar con deploy (diseñado para CI/prod)

### Key Lessons
1. **Actualizar ROADMAP.md y REQUIREMENTS.md dentro del mismo commit de cada plan** — no al final del milestone; la reconciliación tardía crea trabajo extra
2. **La interfaz TypeScript primero**: definir `EmitirComprobanteParams/Result` en el doc de research antes de escribir el stub garantizó alineación; el mismo patrón aplica a cualquier integración externa
3. **Advertir sobre restricciones regulatorias en el research**: documentar explícitamente la restricción CAEA-contingency-only (RG 5782/2025) con flag de verificación evita decisiones incorrectas en v1.2
4. **El rol FACTURADOR como ciudadano de primera clase**: diseñar el dashboard y los endpoints desde el rol (no como extensión del Profesional) simplificó permisos y evitó hacks de JWT lookup

### Cost Observations
- Model: claude-sonnet-4-6 (balanced profile)
- Sessions: ~9 plan executions
- Notable: Phase 9 Plan 03 (AfipStubService) completada en 1m 27s — los planes más pequeños y bien definidos son los más eficientes

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Avg/Plan | Key Change |
|-----------|--------|-------|----------|----------|------------|
| v1.0 CRM Conversión | 9 | 23 | 8 días | ~21min | Baseline |
| v1.1 Vista Facturador | 4 | 9 | 3 días | ~6min est. | Planes más pequeños y focalizados |

### Cumulative Quality

| Milestone | Tests added | Coverage est. | Zero new deps |
|-----------|-------------|---------------|---------------|
| v1.0 | ~minimal | <6% | Sí (BullMQ ya existía) |
| v1.1 | 9 TDD tests (timezone + service) | <6% | Sí (raw SOAP/XML, no library) |
