# Research Summary — v1.4 Flujo de Pacientes

**Synthesized:** 2026-04-15
**Sources:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md
**Confidence:** HIGH (all findings grounded in direct codebase analysis)

---

## Stack Additions

**No new npm packages required.** El milestone completo es extensión de schema + lógica de servicios.

| Cambio | Detalle |
|--------|--------|
| Nuevo enum `FlujoPaciente` | `CIRUGIA \| TRATAMIENTO \| PENDIENTE` — agregar a `schema.prisma` |
| `Paciente.flujo` | `FlujoPaciente @default(PENDIENTE)` — NOT nullable (evita null-guards en todo el código) |
| `TipoTurno.flujoPaciente` | `FlujoPaciente?` nullable — MANTENER `esCirugia` (sigue usándose en `cerrarSesion()`) |
| Índice compuesto | `@@index([profesionalId, flujo])` en `Paciente` — requerido para queries CRM + Tratamientos |
| Patrón de migración | Additive-nullable → backfill → NOT NULL (mismo patrón que `condicionIVAReceptor` en v1.2) |

---

## Feature Table Stakes

| Feature | Por qué no puede faltar |
|---------|------------------------|
| 5 nuevos TipoTurno seeded | Fundación de la auto-clasificación — sin esto nada funciona |
| Auto-set `Paciente.flujo` al crear turno | Valor central: cero overhead manual para la secretaria |
| CRM kanban + métricas filtrado a CIRUGIA | Resuelve el problema original: pacientes de tratamiento contaminando el embudo |
| Banner de clasificación en LiveTurno (no bloqueante, amber) | Único punto de clasificación confiable — el profesional sabe en la consulta |
| Tab "Tratamientos" en /dashboard/pacientes — lista mensual | Hace visible el volumen de tratamientos; hoy completamente ciego |
| Badge `flujo` en lista de pacientes | Secretaria necesita ver de un vistazo qué pacientes no tienen clasificación |
| PATCH `/pacientes/:id/flujo` endpoint | Requerido por el banner de LiveTurno + override manual |

---

## Watch Out For

### 1. Backfill de migración (CRÍTICO)
**Incorrecto:** `UPDATE Paciente SET flujo = 'PENDIENTE'` para todos los existentes → el Kanban queda vacío.
**Correcto:** Join contra `Turno.esCirugia` para inferir CIRUGIA en pacientes con historial de cirugía. Pacientes con `etapaCRM IS NOT NULL` deben quedar como CIRUGIA.

### 2. Filtro CRM debe manejar pacientes legacy
`WHERE flujo = 'CIRUGIA'` solo elimina silenciosamente todos los pacientes pre-v1.4 del embudo.
**Filtro correcto:** `WHERE (flujo = 'CIRUGIA' OR (flujo IS NULL AND etapaCRM IS NOT NULL))`

### 3. Seis queries de reportes CRM necesitan el filtro
`getFunnelSnapshot`, `getKpis`, `getListaAccion`, `getIngresosPotenciales`, `getCoordinatorPerformance` en `crm-dashboard.service.ts` — todas usan solo `profesionalId`. Sin el filtro = métricas silenciosamente incorrectas.

### 4. `crearTurno()` y `cerrarSesion()` deben deployarse juntos con los guards de flujo
Si se separan: pacientes de tratamiento entrarán en el embudo CRM entre deploys.

### 5. El flujo es monotónico para auto-updates
Un paciente CIRUGIA o TRATAMIENTO NUNCA es auto-reclasificado por un turno posterior. Guard: `paciente.flujo === 'PENDIENTE'` antes de actualizar. La reclasificación manual (banner LiveTurno o PATCH) bypasea este guard intencionalmente.

### 6. Null-guard de SECRETARIA debe extenderse al path de actualización de flujo
El patrón establecido (Phase 2.1) debe replicarse en la lógica de flujo dentro de `crearTurno()`.

### 7. `null` vs `PENDIENTE` son estados diferentes
- `flujo = null` (pacientes legacy, pre-v1.4): mostrar badge gris "Sin clasificar". NO dispara banner en LiveTurno.
- `flujo = PENDIENTE` (reservaron "Consulta pendiente"): mostrar badge amber. SÍ dispara banner en LiveTurno.

---

## Orden de Build Recomendado

```
Phase 22: Schema Foundation
  → enum FlujoPaciente + Paciente.flujo + TipoTurno.flujoPaciente
  → Migración con SQL de backfill (inferir CIRUGIA desde Turno.esCirugia / etapaCRM)
  → Seed 5 nuevos TipoTurno
  → PATCH /pacientes/:id/flujo endpoint
  BLOQUEA todo lo de abajo

Phase 23: Backend Logic
  → crearTurno() hook de auto-update (+ null-guard SECRETARIA)
  → cerrarSesion() flujo guard
  → CRM kanban + lista-acción + 5 queries en crm-dashboard.service.ts filtradas a CIRUGIA
  → GET /pacientes/tratamientos?profesionalId=X&mes=YYYY-MM endpoint
  BLOQUEA Phases 24 y 25

Phase 24: LiveTurno Banner
  → pacienteFlujo en session DTO
  → Componente ClasificacionBanner (amber, no bloqueante, dismissible por sesión)
  → Hook useClasificarFlujo
  INDEPENDIENTE de Phase 25

Phase 25: Tratamientos Tab
  → Hook useTratamientosMes
  → Componente TratamientosTab (lista mensual, nav por mes, filtro por tipo)
  → Badge flujo en columna de PacientesDataTable
  → /dashboard/pacientes: agregar tab Tratamientos
  INDEPENDIENTE de Phase 24
```

---

## Decisiones Clave a Registrar

| Decisión | Rationale |
|----------|-----------|
| `@default(PENDIENTE)` no nullable | Elimina null-guards; PENDIENTE es semánticamente "aún no clasificado" |
| Mantener `esCirugia` junto a `flujoPaciente` | `cerrarSesion()` lo usa para la transición PROCEDIMIENTO_REALIZADO; remover en cleanup post-v1.4 |
| Tab de Tratamientos consulta turnos, no Paciente.flujo | Evita clasificación obsoleta: turnos de tratamiento pasados permanecen en la lista aunque el paciente cambie de flujo |
| Filtro legacy: `flujo = CIRUGIA OR (flujo IS NULL AND etapaCRM IS NOT NULL)` | Previene regresión silenciosa de datos — pacientes existentes del embudo no deben desaparecer |
| Flujo monotónico para auto-updates (solo actualiza pacientes PENDIENTE) | Previene que un paciente CIRUGIA sea reclasificado por un turno de Control posterior |
| Banner LiveTurno: no bloqueante, dismissible por sesión | Los modales bloqueantes rompen el flujo de consulta clínica; un toast es demasiado transitorio |

---

*Research completo: 2026-04-15 | 4 researchers*
